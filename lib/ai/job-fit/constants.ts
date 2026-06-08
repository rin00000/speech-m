/**
 * Job-Fit 배치 실행에서 공유하는 운영 상수.
 * 관리자 API와 클라이언트 버튼이 같은 배치 한도, 재활성화 지연, 락 TTL 값을 참조한다.
 */

// 관리자 수동 실행에서 한 번에 DB에서 가져와 판별을 시도할 pending 공고 최대 개수.
export const ADMIN_JOB_FIT_BATCH_LIMIT = 30;

// 관리자 UI에서 AI 배치 실행 버튼을 다시 활성화하기까지 기다리는 시간.
export const AI_BATCH_REENABLE_MS = 180_000;

// 관리자 수동 실행 락이 release되지 못했을 때 자동 만료되기까지의 시간.
export const JOB_FIT_ADMIN_RUN_LOCK_TTL_MS = 10 * 60_000;
