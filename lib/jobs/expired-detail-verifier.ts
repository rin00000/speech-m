/**
 * 텍스트 마감 공고의 상세 페이지를 재검증해 실제 마감된 행을 정리한다.
 * 리스트에서 사라진 `채용시까지` 계열 공고를 상세 신호로 삭제하고 재수집을 차단한다.
 */
import * as cheerio from "cheerio";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BASE_FETCH_HEADERS } from "@/lib/crawl/shared";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database, JobSource } from "@/types/database.types";
import { STALE_PURGE_LISTING_SOURCES } from "./purge-stale-listings";

type AdminClient = SupabaseClient<Database>;

export type ExpiredDetailCandidate = Pick<
  Database["public"]["Tables"]["job_postings"]["Row"],
  | "id"
  | "source"
  | "source_url"
  | "deadline"
  | "status"
  | "published_at"
  | "last_seen_at"
  | "detail_verified_at"
>;

export type ExpiredDetailCheckState = "expired" | "active" | "unknown";

export type ExpiredDetailCheckResult = {
  state: ExpiredDetailCheckState;
  checkedUrl: string;
  reason: string;
  status?: number;
};

export type ExpiredDetailVerificationError = {
  id?: string;
  sourceUrl?: string;
  message: string;
};

export type ExpiredDetailVerificationResult = {
  success: boolean;
  checked: number;
  deleted: number;
  blocked: number;
  verified: number;
  skipped: number;
  errors: ExpiredDetailVerificationError[];
  error?: string;
};

type DetailFetch = (input: string, init?: RequestInit) => Promise<Response>;
type ExpiredDetailRemovalResult = Pick<ExpiredDetailVerificationResult, "blocked" | "deleted">;
type ExpiredDetailRemoval = (
  jobs: readonly ExpiredDetailCandidate[]
) => Promise<ExpiredDetailRemovalResult>;
type ExpiredDetailTouch = (jobs: readonly ExpiredDetailCandidate[]) => Promise<number>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NON_ISO_DEADLINE_LIKE_PATTERN = "____-__-__";
const DETAIL_CANDIDATE_OR_EXPRESSION = [
  `deadline.not.like.${NON_ISO_DEADLINE_LIKE_PATTERN}`,
  "status.eq.approved",
  "published_at.not.is.null",
].join(",");
const DEFAULT_EXPIRED_DETAIL_VERIFY_LIMIT = 50;
const MAX_EXPIRED_DETAIL_VERIFY_LIMIT = 200;
const DEFAULT_EXPIRED_DETAIL_VERIFY_CONCURRENCY = 3;
const MAX_EXPIRED_DETAIL_VERIFY_CONCURRENCY = 10;
const MUTATION_CHUNK = 200;

const EXPIRED_WORD = "\uB9C8\uAC10";
const SARAMIN_EXPIRED_APPLY_TEXT = "\uC811\uC218\uB9C8\uAC10";
const MEDIAJOB_EXPIRED_TEXT = "\uB9C8\uAC10\uB41C \uACF5\uACE0\uC785\uB2C8\uB2E4";

const normalizeText = (value: string): string => value.replace(/\s+/g, " ").trim();

const isMediajobSource = (source: JobSource): boolean => source.startsWith("mediajob_");

export function isExpiredDetailVerificationCandidate(job: ExpiredDetailCandidate): boolean {
  const hasNonIsoDeadline = Boolean(job.deadline && !ISO_DATE.test(job.deadline));
  return hasNonIsoDeadline || job.status === "approved" || Boolean(job.published_at);
}

function compareNullableIso(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return a.localeCompare(b);
}

export function compareExpiredDetailCandidates(
  a: ExpiredDetailCandidate,
  b: ExpiredDetailCandidate
): number {
  const byDetailVerified = compareNullableIso(a.detail_verified_at, b.detail_verified_at);
  if (byDetailVerified !== 0) return byDetailVerified;
  return compareNullableIso(a.last_seen_at, b.last_seen_at);
}

const getEnvInt = (name: string, fallback: number, max: number): number => {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
};

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current]);
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
};

export function toSaraminCanonicalDetailUrl(sourceUrl: string): string {
  const match = sourceUrl.match(/[?&]rec_idx=(\d+)/);
  if (!match) return sourceUrl;
  return `https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=${match[1]}`;
}

export function isSaraminExpiredHtml(html: string): boolean {
  if (html.includes("sri_btn_expired_apply")) return true;
  if (html.includes(SARAMIN_EXPIRED_APPLY_TEXT)) return true;

  const $ = cheerio.load(html);
  return $(".sri_btn_expired_apply").length > 0;
}

export function isMediajobExpiredHtml(html: string): boolean {
  if (html.includes(MEDIAJOB_EXPIRED_TEXT)) return true;

  const $ = cheerio.load(html);
  const applyText = normalizeText(
    $("#tab02 > dd.rcmd_ap_way.bottom > div > span").first().text()
  );
  return applyText.includes(EXPIRED_WORD);
}

export function isJobkoreaExpiredStatus(status: number): boolean {
  return status === 404;
}

export function buildExpiredDetailVerificationUrl(job: ExpiredDetailCandidate): string {
  if (job.source === "saramin") return toSaraminCanonicalDetailUrl(job.source_url);
  return job.source_url;
}

function buildFetchHeaders(source: JobSource): HeadersInit {
  if (source === "saramin") {
    return {
      ...BASE_FETCH_HEADERS,
      Referer: "https://www.saramin.co.kr/zf_user/jobs/list/job-category",
    };
  }
  if (source === "jobkorea") {
    return {
      ...BASE_FETCH_HEADERS,
      Referer: "https://www.jobkorea.co.kr/recruit/joblist?menucode=duty",
    };
  }
  return {
    ...BASE_FETCH_HEADERS,
    Referer: "https://www.mediajob.co.kr",
  };
}

export async function checkJobDetailExpired(
  job: ExpiredDetailCandidate,
  fetcher: DetailFetch = fetch
): Promise<ExpiredDetailCheckResult> {
  const checkedUrl = buildExpiredDetailVerificationUrl(job);
  const response = await fetcher(checkedUrl, {
    headers: buildFetchHeaders(job.source),
    cache: "no-store",
    redirect: "follow",
  });

  if (job.source === "jobkorea" && isJobkoreaExpiredStatus(response.status)) {
    return { state: "expired", checkedUrl, reason: "jobkorea_404", status: response.status };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (job.source === "jobkorea") {
    return { state: "active", checkedUrl, reason: "jobkorea_detail_available", status: response.status };
  }

  const html = await response.text();
  const expired =
    job.source === "saramin"
      ? isSaraminExpiredHtml(html)
      : isMediajobSource(job.source) && isMediajobExpiredHtml(html);

  return {
    state: expired ? "expired" : "active",
    checkedUrl,
    reason: expired ? `${job.source}_expired_signal` : `${job.source}_active_signal_absent`,
    status: response.status,
  };
}

export async function removeExpiredDetailJobs(
  supabase: AdminClient,
  jobs: readonly ExpiredDetailCandidate[]
): Promise<ExpiredDetailRemovalResult> {
  const uniqueJobs = [
    ...new Map(jobs.map((job) => [job.id, job])).values(),
  ].filter((job) => job.source_url.trim());
  if (!uniqueJobs.length) return { blocked: 0, deleted: 0 };

  const rows = uniqueJobs.map((job) => ({
    source_url: job.source_url,
    reason: "ttl_purge",
  }));

  for (const part of chunk(rows, MUTATION_CHUNK)) {
    const { error } = await supabase
      .from("crawl_blocked_source_urls")
      .upsert(part, { onConflict: "source_url", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  const ids = uniqueJobs.map((job) => job.id);
  let deleted = 0;
  for (const part of chunk(ids, MUTATION_CHUNK)) {
    const { error } = await supabase.from("job_postings").delete().in("id", part);
    if (error) throw new Error(error.message);
    deleted += part.length;
  }

  return { blocked: rows.length, deleted };
}

export async function touchExpiredDetailJobs(
  supabase: AdminClient,
  jobs: readonly ExpiredDetailCandidate[],
  verifiedAt: string = new Date().toISOString()
): Promise<number> {
  const ids = [...new Set(jobs.map((job) => job.id).filter(Boolean))];
  if (!ids.length) return 0;

  let touched = 0;
  for (const part of chunk(ids, MUTATION_CHUNK)) {
    const { error } = await supabase
      .from("job_postings")
      .update({ detail_verified_at: verifiedAt })
      .in("id", part);
    if (error) throw new Error(error.message);
    touched += part.length;
  }
  return touched;
}

export async function verifyExpiredDetailCandidates(
  candidates: readonly ExpiredDetailCandidate[],
  options: {
    fetcher?: DetailFetch;
    concurrency?: number;
    removeExpired?: ExpiredDetailRemoval;
    touchVerified?: ExpiredDetailTouch;
  } = {}
): Promise<ExpiredDetailVerificationResult> {
  const fetcher = options.fetcher ?? fetch;
  const concurrency = Math.min(
    Math.max(1, options.concurrency ?? DEFAULT_EXPIRED_DETAIL_VERIFY_CONCURRENCY),
    MAX_EXPIRED_DETAIL_VERIFY_CONCURRENCY
  );
  const errors: ExpiredDetailVerificationError[] = [];

  const checks = await mapWithConcurrency(candidates, concurrency, async (job) => {
    try {
      return { job, result: await checkJobDetailExpired(job, fetcher) };
    } catch (error) {
      errors.push({
        id: job.id,
        sourceUrl: job.source_url,
        message: error instanceof Error ? error.message : String(error),
      });
      return { job, result: null };
    }
  });

  const expiredJobs = checks
    .filter((item) => item.result?.state === "expired")
    .map((item) => item.job);
  const verifiedJobs = checks
    .filter((item) => item.result?.state !== "expired")
    .map((item) => item.job);

  let removed: ExpiredDetailRemovalResult = { blocked: 0, deleted: 0 };
  let verified = 0;

  try {
    removed = expiredJobs.length
      ? await (options.removeExpired ?? (async () => ({ blocked: 0, deleted: 0 })))(expiredJobs)
      : removed;
    verified = verifiedJobs.length
      ? await (options.touchVerified ?? (async () => 0))(verifiedJobs)
      : 0;

    return {
      success: true,
      checked: candidates.length,
      deleted: removed.deleted,
      blocked: removed.blocked,
      verified,
      skipped: candidates.length - expiredJobs.length,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      checked: candidates.length,
      deleted: removed.deleted,
      blocked: removed.blocked,
      verified,
      skipped: candidates.length,
      errors: [...errors, { message }],
      error: message,
    };
  }
}

async function fetchExpiredDetailCandidates(
  supabase: AdminClient,
  limit: number
): Promise<ExpiredDetailCandidate[]> {
  const { data, error } = await supabase
    .from("job_postings")
    .select("id, source, source_url, deadline, status, published_at, last_seen_at, detail_verified_at")
    .in("source", [...STALE_PURGE_LISTING_SOURCES])
    .in("status", ["pending", "approved"])
    .or(DETAIL_CANDIDATE_OR_EXPRESSION)
    .order("detail_verified_at", { ascending: true, nullsFirst: true })
    .order("last_seen_at", { ascending: true, nullsFirst: true })
    .limit(limit)
    .returns<ExpiredDetailCandidate[]>();

  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter(isExpiredDetailVerificationCandidate)
    .sort(compareExpiredDetailCandidates);
}

export async function runExpiredDetailVerification(options: {
  limit?: number;
  concurrency?: number;
  fetcher?: DetailFetch;
  supabase?: AdminClient;
} = {}): Promise<ExpiredDetailVerificationResult> {
  const supabase = options.supabase ?? createAdminClient();
  const limit =
    options.limit ??
    getEnvInt(
      "EXPIRED_DETAIL_VERIFY_LIMIT",
      DEFAULT_EXPIRED_DETAIL_VERIFY_LIMIT,
      MAX_EXPIRED_DETAIL_VERIFY_LIMIT
    );

  try {
    const candidates = await fetchExpiredDetailCandidates(supabase, limit);
    return await verifyExpiredDetailCandidates(candidates, {
      fetcher: options.fetcher,
      concurrency: options.concurrency,
      removeExpired: (expiredJobs) => removeExpiredDetailJobs(supabase, expiredJobs),
      touchVerified: (verifiedJobs) => touchExpiredDetailJobs(supabase, verifiedJobs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      checked: 0,
      deleted: 0,
      blocked: 0,
      verified: 0,
      skipped: 0,
      errors: [{ message }],
      error: message,
    };
  }
}
