-- Create system_settings table for global configurations
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.system_settings is '서비스 전역 설정값을 저장하는 JSONB 테이블입니다.';
comment on column public.system_settings.key is '설정 키 식별자';
comment on column public.system_settings.value is 'JSON 형식의 설정 값';

-- RLS 활성화
alter table public.system_settings enable row level security;

-- 정책 A: 모든 로그인된 회원은 설정을 조회할 수 있습니다.
create policy "system_settings_select_all"
  on public.system_settings
  for select
  to authenticated
  using (true);

-- 정책 B: 원장/관리자(admin) 권한만 설정을 수정 및 삭제할 수 있습니다.
create policy "system_settings_all_admin"
  on public.system_settings
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.email = auth.jwt() ->> 'email'
        and user_profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where user_profiles.email = auth.jwt() ->> 'email'
        and user_profiles.role = 'admin'
    )
  );

-- 초기 기본 설정 시딩 (upsert 패턴)
insert into public.system_settings (key, value)
values
  ('ai_filter_enabled', 'true'::jsonb),
  ('ai_match_threshold', '0.75'::jsonb),
  ('crawl_interval_hours', '6'::jsonb),
  ('crawl_channels_active', '{"mediajob": true, "arang": true, "kbs": true}'::jsonb),
  ('crm_retention_days', '60'::jsonb),
  ('study_deposit_amount', '30000'::jsonb),
  ('study_penalty_amount', '5000'::jsonb)
on conflict (key) do nothing;
