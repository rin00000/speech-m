-- Crawl blacklist: URLs removed from job_postings (rejected delete / TTL) must not re-enter via upsert.
create table public.crawl_blocked_source_urls (
  source_url text not null primary key,
  created_at timestamptz not null default now(),
  reason text null
);

comment on table public.crawl_blocked_source_urls is '거절 공고 하드 삭제 시 보관하는 원문 URL. 크롤 upsert 전에 제외한다.';
comment on column public.crawl_blocked_source_urls.source_url is 'job_postings.source_url과 동일한 문자열.';
comment on column public.crawl_blocked_source_urls.reason is '선택: manual_delete, ttl_purge 등';

alter table public.crawl_blocked_source_urls enable row level security;
