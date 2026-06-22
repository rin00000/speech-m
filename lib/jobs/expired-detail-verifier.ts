/**
 * 텍스트 마감 공고의 상세 페이지를 재검증해 실제 마감된 행을 정리한다.
 * 리스트에서 사라진 `채용시까지` 계열 공고를 상세 신호로 삭제하고 재수집을 차단한다.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { STALE_PURGE_LISTING_SOURCES } from "./purge-stale-listings";
import {
  checkJobDetailExpired,
  compareExpiredDetailCandidates,
  isExpiredDetailVerificationCandidate,
} from "./expired-detail-check";
import { removeExpiredDetailJobs, touchExpiredDetailJobs } from "./expired-detail-mutations";
import type {
  AdminClient,
  DetailFetch,
  ExpiredDetailCandidate,
  ExpiredDetailRemoval,
  ExpiredDetailRemovalResult,
  ExpiredDetailTouch,
  ExpiredDetailVerificationError,
  ExpiredDetailVerificationResult,
} from "./expired-detail-types";

export type {
  AdminClient,
  DetailFetch,
  ExpiredDetailCandidate,
  ExpiredDetailCheckResult,
  ExpiredDetailCheckState,
  ExpiredDetailVerificationError,
  ExpiredDetailVerificationResult,
} from "./expired-detail-types";
export {
  buildExpiredDetailVerificationUrl,
  checkJobDetailExpired,
  compareExpiredDetailCandidates,
  isExpiredDetailVerificationCandidate,
  isJobkoreaExpiredHtml,
  isJobkoreaExpiredStatus,
  isMediajobExpiredHtml,
  isSaraminExpiredHtml,
  toSaraminCanonicalDetailUrl,
} from "./expired-detail-check";
export { removeExpiredDetailJobs, touchExpiredDetailJobs } from "./expired-detail-mutations";

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

const getEnvInt = (name: string, fallback: number, max: number): number => {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
};

const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
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

export async function verifyExpiredDetailCandidates(
  candidates: readonly ExpiredDetailCandidate[],
  options: {
    fetcher?: DetailFetch;
    concurrency?: number;
    removeExpired?: ExpiredDetailRemoval;
    touchVerified?: ExpiredDetailTouch;
  } = {},
): Promise<ExpiredDetailVerificationResult> {
  const fetcher = options.fetcher ?? fetch;
  const concurrency = Math.min(
    Math.max(1, options.concurrency ?? DEFAULT_EXPIRED_DETAIL_VERIFY_CONCURRENCY),
    MAX_EXPIRED_DETAIL_VERIFY_CONCURRENCY,
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
  limit: number,
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

export async function runExpiredDetailVerification(
  options: {
    limit?: number;
    concurrency?: number;
    fetcher?: DetailFetch;
    supabase?: AdminClient;
  } = {},
): Promise<ExpiredDetailVerificationResult> {
  const supabase = options.supabase ?? createAdminClient();
  const limit =
    options.limit ??
    getEnvInt(
      "EXPIRED_DETAIL_VERIFY_LIMIT",
      DEFAULT_EXPIRED_DETAIL_VERIFY_LIMIT,
      MAX_EXPIRED_DETAIL_VERIFY_LIMIT,
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
