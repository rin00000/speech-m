-- 마지막 AI 적합도 배치(runJobFitBatch)의 자동 판정 스냅샷. 수동 검수로 상태를 바꾸면 null로 비운다.
alter table public.job_postings
  add column if not exists ai_fit_snapshot jsonb null;

comment on column public.job_postings.ai_fit_snapshot is
  'runJobFitBatch 자동 승인/거절 시점의 LLM·점수·사유 등 JSON. updateJobStatus 등 수동 변경 시 null.';
