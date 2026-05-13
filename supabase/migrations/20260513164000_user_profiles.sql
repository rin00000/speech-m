create table if not exists public.user_profiles (
  email text primary key,
  role text not null default 'student' check (role in ('admin', 'student')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using (email = auth.jwt() ->> 'email');

create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using (email = auth.jwt() ->> 'email')
with check (email = auth.jwt() ->> 'email');
