-- Fingerprint for cross-site dedup; last_seen_at for crawl freshness.
alter table public.job_postings
  add column if not exists fingerprint text null;

alter table public.job_postings
  add column if not exists last_seen_at timestamptz null;

comment on column public.job_postings.fingerprint is '정규화 company|title 지문. 교차 소스 중복 스킵·조회용.';
comment on column public.job_postings.last_seen_at is '마지막으로 리스트 크롤에서 관측된 시각.';

create index if not exists idx_job_postings_fingerprint
  on public.job_postings (fingerprint)
  where fingerprint is not null;

-- upsert(onConflict: source_url) 및 URL 단일성에 필요.
create unique index if not exists job_postings_source_url_key
  on public.job_postings (source_url);

-- 앱에서 status 미포함 배치 메타 갱신.
create or replace function public.batch_update_job_posting_crawl_meta(p_rows jsonb)
returns void
language plpgsql
as $$
begin
  update public.job_postings j
  set
    title = coalesce(nullif(trim(e->>'title'), ''), j.title),
    company = case when e ? 'company' then nullif(e->>'company', '') else j.company end,
    location = case when e ? 'location' then nullif(e->>'location', '') else j.location end,
    deadline = case when e ? 'deadline' then nullif(e->>'deadline', '')::text else j.deadline end,
    fingerprint = coalesce(nullif(trim(e->>'fingerprint'), ''), j.fingerprint),
    last_seen_at = coalesce((e->>'last_seen_at')::timestamptz, now())
  from jsonb_array_elements(p_rows) as e
  where j.id = (e->>'id')::uuid;
end;
$$;

comment on function public.batch_update_job_posting_crawl_meta(jsonb) is
  '크롤 메타만 배치 갱신. status·rejected_at는 변경하지 않는다.';

-- ISO 마감이 지난 리스트형 공고: 블록리스트 이관 후 삭제(원자적).
create or replace function public.purge_stale_job_listings(
  p_cutoff_iso text,
  p_include_published boolean default false
)
returns integer
language plpgsql
as $$
declare
  v_deleted integer;
begin
  insert into public.crawl_blocked_source_urls (source_url, reason)
  select j.source_url, 'ttl_purge'::text
  from public.job_postings j
  where j.source::text = any (
      array[
        'mediajob_announcer',
        'mediajob_reporter',
        'mediajob_intern',
        'saramin',
        'jobkorea'
      ]::text[]
    )
    and j.deadline is not null
    and j.deadline ~ '^\d{4}-\d{2}-\d{2}$'
    and (j.deadline::date <= p_cutoff_iso::date)
    and (p_include_published or j.published_at is null)
  on conflict (source_url) do nothing;

  delete from public.job_postings j
  where j.source::text = any (
      array[
        'mediajob_announcer',
        'mediajob_reporter',
        'mediajob_intern',
        'saramin',
        'jobkorea'
      ]::text[]
    )
    and j.deadline is not null
    and j.deadline ~ '^\d{4}-\d{2}-\d{2}$'
    and (j.deadline::date <= p_cutoff_iso::date)
    and (p_include_published or j.published_at is null);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.purge_stale_job_listings(text, boolean) is
  '리스트형 소스 ISO 마감이 cutoff 이하인 행을 삭제하고 source_url을 crawl_blocked_source_urls에 넣는다.';

-- 기존 행 지문 백필(앱 정규화와 근사; 이후 크롤 시 TS 규칙으로 덮어씀).
update public.job_postings
set fingerprint =
  regexp_replace(lower(trim(coalesce(company, ''))), '\s+', ' ', 'g')
  || '|'
  || regexp_replace(lower(trim(coalesce(title, ''))), '\s+', ' ', 'g')
where fingerprint is null;
