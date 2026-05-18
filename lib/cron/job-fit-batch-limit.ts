/**
 * Cron `/api/cron/job-fit`에서 한 invocation당 처리할 pending 상한.
 * `JOB_FIT_BATCH_LIMIT`로 덮어쓸 수 있다(1~30). 관리자 수동 배치(30)와 분리해 타임아웃을 줄인다.
 */
export const DEFAULT_JOB_FIT_CRON_BATCH_LIMIT = 12;
export const MAX_JOB_FIT_CRON_BATCH_LIMIT = 30;

export function getJobFitCronBatchLimit(): number {
  const raw = process.env.JOB_FIT_BATCH_LIMIT?.trim();
  if (!raw) return DEFAULT_JOB_FIT_CRON_BATCH_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_JOB_FIT_CRON_BATCH_LIMIT;
  return Math.min(n, MAX_JOB_FIT_CRON_BATCH_LIMIT);
}
