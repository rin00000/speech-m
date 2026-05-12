-- 거절 시각: TTL purge·감사용. 기존 거절 행은 created_at으로 보수적 백필.
alter table public.job_postings
  add column if not exists rejected_at timestamptz null;

comment on column public.job_postings.rejected_at is 'status가 rejected로 확정된 시각. pending/approved로 되돌리면 null.';

update public.job_postings
set rejected_at = created_at
where status = 'rejected'
  and rejected_at is null;
