-- Track when a job posting detail page was last checked for expired status.
alter table public.job_postings
  add column if not exists detail_verified_at timestamptz null;

comment on column public.job_postings.detail_verified_at is
  'Last time the source detail page was checked for expired status.';

create index if not exists idx_job_postings_detail_verify_queue
  on public.job_postings (detail_verified_at asc nulls first, last_seen_at asc nulls first)
  where source::text in (
      'mediajob_announcer',
      'mediajob_reporter',
      'mediajob_intern',
      'saramin',
      'jobkorea'
    )
    and status in ('pending', 'approved');
