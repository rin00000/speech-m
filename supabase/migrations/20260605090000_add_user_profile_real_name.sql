alter table public.user_profiles
  add column if not exists real_name text;
