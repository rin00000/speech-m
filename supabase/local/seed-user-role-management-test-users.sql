-- Local-only seed data for user role management testing.
-- Re-runnable: fixed UUIDs and identity keys are upserted.

WITH seed_users (id, role, email, display_name, real_name, provider_account_id) AS (
  VALUES
    ('00000000-0000-4000-8000-000000000101'::uuid, 'student', 'role-student01@speech-m.local', 'Role Test Student 01', 'Role Test Student 01', 'role-test:student:01'),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'student', 'role-student02@speech-m.local', 'Role Test Student 02', 'Role Test Student 02', 'role-test:student:02'),
    ('00000000-0000-4000-8000-000000000103'::uuid, 'student', 'role-student03@speech-m.local', 'Role Test Student 03', 'Role Test Student 03', 'role-test:student:03'),
    ('00000000-0000-4000-8000-000000000104'::uuid, 'student', 'role-student04@speech-m.local', 'Role Test Student 04', 'Role Test Student 04', 'role-test:student:04'),
    ('00000000-0000-4000-8000-000000000105'::uuid, 'student', 'role-student05@speech-m.local', 'Role Test Student 05', 'Role Test Student 05', 'role-test:student:05'),
    ('00000000-0000-4000-8000-000000000201'::uuid, 'guest', 'role-guest01@speech-m.local', 'Role Test Guest 01', 'Role Test Guest 01', 'role-test:guest:01'),
    ('00000000-0000-4000-8000-000000000202'::uuid, 'guest', 'role-guest02@speech-m.local', 'Role Test Guest 02', 'Role Test Guest 02', 'role-test:guest:02'),
    ('00000000-0000-4000-8000-000000000203'::uuid, 'guest', 'role-guest03@speech-m.local', 'Role Test Guest 03', 'Role Test Guest 03', 'role-test:guest:03'),
    ('00000000-0000-4000-8000-000000000204'::uuid, 'guest', 'role-guest04@speech-m.local', 'Role Test Guest 04', 'Role Test Guest 04', 'role-test:guest:04'),
    ('00000000-0000-4000-8000-000000000205'::uuid, 'guest', 'role-guest05@speech-m.local', 'Role Test Guest 05', 'Role Test Guest 05', 'role-test:guest:05')
),
upsert_users AS (
  INSERT INTO public.users (id, role, status, updated_at)
  SELECT id, role, 'active', now()
  FROM seed_users
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = now()
  RETURNING id
),
upsert_profiles AS (
  INSERT INTO public.user_profiles (
    user_id,
    email,
    display_name,
    real_name,
    avatar_url,
    updated_at
  )
  SELECT
    id,
    email,
    display_name,
    real_name,
    NULL,
    now()
  FROM seed_users
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      real_name = EXCLUDED.real_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = now()
  RETURNING user_id
)
INSERT INTO public.user_auth_identities (
  user_id,
  provider,
  provider_account_id,
  provider_email,
  email_verified,
  updated_at
)
SELECT
  id,
  'credentials',
  provider_account_id,
  email,
  true,
  now()
FROM seed_users
ON CONFLICT (provider, provider_account_id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    provider_email = EXCLUDED.provider_email,
    email_verified = EXCLUDED.email_verified,
    updated_at = now();
