/**
 * 공고 상세 페이지 HTML/HTTP 응답 기반 마감 판정 로직.
 * 사이트별 판정 규칙을 배치 실행과 DB mutation에서 분리한다.
 */

import * as cheerio from "cheerio";
import { BASE_FETCH_HEADERS } from "@/lib/crawl/shared";
import type { JobSource } from "@/types/database.types";
import type {
  DetailFetch,
  ExpiredDetailCandidate,
  ExpiredDetailCheckResult,
} from "./expired-detail-types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EXPIRED_WORD = "\uB9C8\uAC10";
const SARAMIN_EXPIRED_APPLY_TEXT = "\uC811\uC218\uB9C8\uAC10";
const MEDIAJOB_EXPIRED_TEXT = "\uB9C8\uAC10\uB41C \uACF5\uACE0\uC785\uB2C8\uB2E4";
const JOBKOREA_EXPIRED_STATUS_TEXTS = [
  "\uB9C8\uAC10 \uACF5\uACE0",
  "\uB9C8\uAC10\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
] as const;
const KOREA_TIME_ZONE = "Asia/Seoul";

const normalizeText = (value: string): string => value.replace(/\s+/g, " ").trim();

const isMediajobSource = (source: JobSource): boolean => source.startsWith("mediajob_");

const getKoreaTodayIso = (today: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: KOREA_TIME_ZONE }).format(today);

const getIsoDatePart = (value: string): string | null => {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
};

const isJobPostingType = (type: unknown): boolean => {
  if (typeof type === "string") return type === "JobPosting";
  if (Array.isArray(type)) return type.includes("JobPosting");
  return false;
};

const collectJobPostingValidThrough = (value: unknown, out: string[]): void => {
  if (Array.isArray(value)) {
    for (const item of value) collectJobPostingValidThrough(item, out);
    return;
  }

  if (value === null || typeof value !== "object") return;

  const node = value as Record<string, unknown>;
  if (isJobPostingType(node["@type"]) && typeof node.validThrough === "string") {
    out.push(node.validThrough);
  }
  collectJobPostingValidThrough(node["@graph"], out);
};

const parseJsonLd = (text: string): unknown | null => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const isPastValidThrough = (validThrough: string, today: Date): boolean => {
  const validThroughDate = getIsoDatePart(validThrough);
  if (!validThroughDate) return false;

  const todayIso = getKoreaTodayIso(today);
  if (validThroughDate < todayIso) return true;
  if (validThroughDate > todayIso) return false;

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(validThrough)) {
    const timestamp = Date.parse(validThrough);
    return Number.isFinite(timestamp) && timestamp < today.getTime();
  }

  return false;
};

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
  b: ExpiredDetailCandidate,
): number {
  const byDetailVerified = compareNullableIso(a.detail_verified_at, b.detail_verified_at);
  if (byDetailVerified !== 0) return byDetailVerified;
  return compareNullableIso(a.last_seen_at, b.last_seen_at);
}

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
    $("#tab02 > dd.rcmd_ap_way.bottom > div > span").first().text(),
  );
  return applyText.includes(EXPIRED_WORD);
}

export function isJobkoreaExpiredHtml(html: string, today: Date = new Date()): boolean {
  if (JOBKOREA_EXPIRED_STATUS_TEXTS.some((text) => html.includes(text))) return true;

  const $ = cheerio.load(html);
  const asideStatusText = normalizeText(
    $("main aside button span span")
      .map((_, el) => $(el).text())
      .get()
      .join(" "),
  );
  if (JOBKOREA_EXPIRED_STATUS_TEXTS.some((text) => asideStatusText.includes(text))) {
    return true;
  }

  const bodyText = normalizeText($("body").text());
  if (JOBKOREA_EXPIRED_STATUS_TEXTS.some((text) => bodyText.includes(text))) {
    return true;
  }

  const validThroughValues: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    collectJobPostingValidThrough(parseJsonLd($(el).text()), validThroughValues);
  });

  return validThroughValues.some((validThrough) => isPastValidThrough(validThrough, today));
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
  fetcher: DetailFetch = fetch,
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
    const html = await response.text();
    const expired = isJobkoreaExpiredHtml(html);
    return {
      state: expired ? "expired" : "active",
      checkedUrl,
      reason: expired ? "jobkorea_expired_signal" : "jobkorea_active_signal_absent",
      status: response.status,
    };
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
