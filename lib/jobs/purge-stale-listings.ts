/**
 * 리스트형 채용 사이트(미디어잡·사람인·잡코리아) 공고는 마감 후 원문 목록에서 사라지는 경우가 많다.
 * 파싱된 ISO 마감일(`YYYY-MM-DD`)과 KST 기준 일자로 “마감+유예일”이 지난 행을 삭제한다.
 * 삭제 전 `source_url`을 `crawl_blocked_source_urls`에 넣어 재수집을 막는다(RPC 단일 트랜잭션).
 * `published_at`이 있는 승인 공고는 기본적으로 제외한다.
 */
import { createAdminClient } from "@/lib/supabase/server";
import type { JobSource } from "@/types/database.types";

/** `CRAWL_SOURCES`와 동일 계열. 아랑·custom은 수집/마감 표기가 달라 여기서 자동 삭제하지 않는다. */
export const STALE_PURGE_LISTING_SOURCES = [
  "mediajob_announcer",
  "mediajob_reporter",
  "mediajob_intern",
  "saramin",
  "jobkorea",
] as const satisfies readonly JobSource[];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** KST 달력 기준 오늘 `YYYY-MM-DD`. */
export function koreaTodayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

/** ISO 날짜 문자열에 달력 일수를 더한다(UTC 자정 기준). */
export function addCalendarDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + deltaDays);
  return t.toISOString().slice(0, 10);
}

export type RunStaleListingPurgeOptions = {
  /** 마감일 이후 며칠이 지난 행만 삭제할지(기본 1 = KST 기준 “어제” 이전 마감일까지). */
  minAgeDaysAfterDeadline?: number;
  /** true면 `published_at`이 있는 승인 공고도 삭제 대상에 포함(기본 false). */
  includePublished?: boolean;
};

export type RunStaleListingPurgeResult = {
  success: boolean;
  cutoffIso: string;
  scanned: number;
  deleted: number;
  error?: string;
};

/**
 * 마감일(`deadline`)이 `cutoffIso` 이하인 ISO 날짜 행만 삭제 후보로 본다.
 * `deadline`이 `상시채용` 등 텍스트인 행은 RPC `WHERE deadline ~ ISO`에 걸리지 않아 오삭제되지 않는다.
 */
export async function runStaleListingPurge(
  options: RunStaleListingPurgeOptions = {}
): Promise<RunStaleListingPurgeResult> {
  const minAge = options.minAgeDaysAfterDeadline ?? getEnvInt("STALE_LISTING_PURGE_MIN_AGE_DAYS", 1);
  const includePublished =
    options.includePublished ?? process.env.STALE_LISTING_PURGE_INCLUDE_PUBLISHED === "true";

  const todayKr = koreaTodayIso();
  const cutoffIso = addCalendarDays(todayKr, -minAge);

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("purge_stale_job_listings", {
    p_cutoff_iso: cutoffIso,
    p_include_published: includePublished,
  });

  if (error) {
    return {
      success: false,
      cutoffIso,
      scanned: 0,
      deleted: 0,
      error: error.message,
    };
  }

  const deleted = typeof data === "number" && Number.isFinite(data) ? data : Number(data ?? 0);

  return {
    success: true,
    cutoffIso,
    scanned: deleted,
    deleted,
  };
}

function getEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** @deprecated ISO 패턴 검사는 purge RPC 내부에서 수행한다. 테스트·호환용으로 유지. */
export const staleListingIsoDeadlinePattern = ISO_DATE;
