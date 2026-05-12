/**
 * 거절 공고 TTL: 크론 `purgeRejectedPastRetention`과 관리자 UI 문구가 같은 값을 쓰도록 한다.
 * `REJECTED_JOB_RETENTION_DAYS`로 덮어쓸 수 있다(1 이상 정수).
 */
export const DEFAULT_REJECTED_JOB_RETENTION_DAYS = 10;

export function getRejectedJobRetentionDays(): number {
  const raw = process.env.REJECTED_JOB_RETENTION_DAYS?.trim();
  if (!raw) return DEFAULT_REJECTED_JOB_RETENTION_DAYS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_REJECTED_JOB_RETENTION_DAYS;
}
