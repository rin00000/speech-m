/**
 * Job-Fit 배치 실행에서 공유하는 운영 상수.
 * 관리자 API와 클라이언트 버튼이 같은 배치 한도, 재활성화 지연, 락 TTL 값을 참조한다.
 */

export const ADMIN_JOB_FIT_BATCH_LIMIT = 30;
export const AI_BATCH_REENABLE_MS = 180_000;
export const JOB_FIT_ADMIN_RUN_LOCK_TTL_MS = 10 * 60_000;
