import { TEXT_DEADLINE } from "@/lib/crawl/shared";
import { koreaTodayIso } from "@/lib/jobs/purge-stale-listings";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** PostgREST `in()` URL 길이·응답 크기 고려. */
export const FINGERPRINT_IN_QUERY_CHUNK = 120;

export const resolveMaxConsecutiveDuplicateUrls = (): number => {
  const raw = process.env.CRAWL_MAX_CONSECUTIVE_DUPLICATES?.trim();
  if (!raw) return 5;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(n, 50);
};

export function normalizeForFingerprintPart(value: string | null | undefined): string {
  const t = (value ?? "").trim().normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
  return t;
}

export function computeJobFingerprint(
  company: string | null | undefined,
  title: string | null | undefined
): string {
  return `${normalizeForFingerprintPart(company)}|${normalizeForFingerprintPart(title)}`;
}

/**
 * 교차 중복 스킵용: pending/approved 중 “아직 유효한” 마감으로 볼 수 있는 행만 대상으로 삼을 때 사용.
 */
export function isDeadlineActiveForDedup(deadline: string | null): boolean {
  if (deadline == null || deadline === "") return true;
  if (TEXT_DEADLINE.has(deadline)) return true;
  if (!ISO_DATE.test(deadline)) return true;
  const today = koreaTodayIso();
  return deadline >= today;
}
