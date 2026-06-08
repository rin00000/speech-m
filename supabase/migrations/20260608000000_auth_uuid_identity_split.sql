-- Auth UUID identity split.
-- Current user/domain rows are test data, so this migration cleanly recreates
-- user-owned domain tables around stable internal user UUIDs.

DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "practice_scripts_select_authorized" ON public.practice_scripts;
DROP POLICY IF EXISTS "practice_scripts_all_admin" ON public.practice_scripts;
DROP POLICY IF EXISTS "system_settings_all_admin" ON public.system_settings;

DROP FUNCTION IF EXISTS public.approve_student_upgrade_request(UUID, TEXT);
DROP FUNCTION IF EXISTS public.submit_relay_first_submission(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.submit_relay_feedback_and_submission(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.submit_relay_final_feedback(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.grant_management_class_coupons(TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.apply_management_class(UUID, TEXT);
DROP FUNCTION IF EXISTS public.cancel_management_class_application(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.cancel_management_class(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.find_or_create_user_by_identity(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

DROP TABLE IF EXISTS public.study_relay_feedback CASCADE;
DROP TABLE IF EXISTS public.study_relay_submissions CASCADE;
DROP TABLE IF EXISTS public.study_quests CASCADE;
DROP TABLE IF EXISTS public.study_group_members CASCADE;
DROP TABLE IF EXISTS public.study_groups CASCADE;

DROP TABLE IF EXISTS public.management_class_applications CASCADE;
DROP TABLE IF EXISTS public.management_class_coupons CASCADE;
DROP TABLE IF EXISTS public.management_class_coupon_grants CASCADE;
DROP TABLE IF EXISTS public.management_classes CASCADE;

DROP TABLE IF EXISTS public.student_upgrade_requests CASCADE;
DROP TABLE IF EXISTS public.user_auth_identities CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'student', 'guest')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  real_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'naver', 'credentials')),
  provider_account_id TEXT NOT NULL,
  provider_email TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);

CREATE INDEX user_auth_identities_user_id_idx
  ON public.user_auth_identities(user_id);

CREATE INDEX user_profiles_email_idx
  ON public.user_profiles(email)
  WHERE email IS NOT NULL;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_auth_identities ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_touch_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER user_profiles_touch_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER user_auth_identities_touch_updated_at
BEFORE UPDATE ON public.user_auth_identities
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.find_or_create_user_by_identity(
  p_provider TEXT,
  p_provider_account_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_email_verified BOOLEAN DEFAULT false
)
RETURNS TABLE(user_id UUID, user_role TEXT, user_status TEXT, is_new BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_user_id UUID;
  v_identity_id UUID;
  v_role TEXT;
  v_status TEXT;
BEGIN
  IF p_provider IS NULL OR p_provider NOT IN ('google', 'naver', 'credentials') THEN
    RAISE EXCEPTION 'auth_provider_invalid';
  END IF;

  IF p_provider_account_id IS NULL OR length(trim(p_provider_account_id)) = 0 THEN
    RAISE EXCEPTION 'auth_provider_account_id_required';
  END IF;

  SELECT identities.user_id
  INTO v_user_id
  FROM public.user_auth_identities AS identities
  WHERE identities.provider = p_provider
    AND identities.provider_account_id = p_provider_account_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.user_auth_identities
    SET provider_email = p_email,
        email_verified = coalesce(p_email_verified, false),
        updated_at = now()
    WHERE provider = p_provider
      AND provider_account_id = p_provider_account_id;

    UPDATE public.user_profiles
    SET email = coalesce(p_email, email),
        display_name = coalesce(nullif(trim(p_name), ''), display_name),
        avatar_url = coalesce(p_avatar_url, avatar_url),
        updated_at = now()
    WHERE user_profiles.user_id = v_user_id;

    SELECT users.role, users.status
    INTO v_role, v_status
    FROM public.users
    WHERE users.id = v_user_id;

    RETURN QUERY SELECT v_user_id, v_role, v_status, false;
    RETURN;
  END IF;

  INSERT INTO public.users (role, status)
  VALUES ('guest', 'active')
  RETURNING id INTO v_new_user_id;

  INSERT INTO public.user_profiles (user_id, email, display_name, avatar_url)
  VALUES (
    v_new_user_id,
    p_email,
    nullif(trim(coalesce(p_name, '')), ''),
    p_avatar_url
  );

  INSERT INTO public.user_auth_identities (
    user_id,
    provider,
    provider_account_id,
    provider_email,
    email_verified
  )
  VALUES (
    v_new_user_id,
    p_provider,
    p_provider_account_id,
    p_email,
    coalesce(p_email_verified, false)
  )
  ON CONFLICT (provider, provider_account_id) DO NOTHING
  RETURNING id INTO v_identity_id;

  IF v_identity_id IS NULL THEN
    DELETE FROM public.user_profiles WHERE user_profiles.user_id = v_new_user_id;
    DELETE FROM public.users WHERE users.id = v_new_user_id;

    SELECT identities.user_id
    INTO v_user_id
    FROM public.user_auth_identities AS identities
    WHERE identities.provider = p_provider
      AND identities.provider_account_id = p_provider_account_id;

    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'auth_identity_conflict_unresolved';
    END IF;

    SELECT users.role, users.status
    INTO v_role, v_status
    FROM public.users
    WHERE users.id = v_user_id;

    RETURN QUERY SELECT v_user_id, v_role, v_status, false;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_new_user_id, 'guest'::TEXT, 'active'::TEXT, true;
END;
$$;

REVOKE ALL ON FUNCTION public.find_or_create_user_by_identity(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_or_create_user_by_identity(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

CREATE TABLE public.student_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT,
  message TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX student_upgrade_requests_one_pending_per_user
  ON public.student_upgrade_requests (user_id)
  WHERE status = 'pending';

ALTER TABLE public.student_upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.approve_student_upgrade_request(
  p_request_id UUID,
  p_resolved_by_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID;
BEGIN
  SELECT requests.user_id
  INTO v_target_user_id
  FROM public.student_upgrade_requests AS requests
  WHERE requests.id = p_request_id
    AND requests.status = 'pending'
  FOR UPDATE;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'student_upgrade_request_not_pending';
  END IF;

  UPDATE public.users
  SET role = 'student',
      updated_at = now()
  WHERE users.id = v_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_upgrade_request_user_not_found';
  END IF;

  UPDATE public.student_upgrade_requests
  SET status = 'approved',
      resolved_at = now(),
      resolved_by_user_id = p_resolved_by_user_id
  WHERE id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_student_upgrade_request(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_student_upgrade_request(UUID, UUID) TO service_role;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'study-audio',
  'study-audio',
  false,
  20971520,
  ARRAY[
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/wav',
    'audio/wave',
    'audio/x-wav'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'relay' CHECK (type IN ('relay')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.study_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, student_user_id)
);

CREATE TABLE public.study_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  script_title TEXT NOT NULL,
  script_content TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.study_relay_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.study_quests(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  audio_path TEXT NOT NULL,
  audio_file_name TEXT NOT NULL,
  audio_content_type TEXT NOT NULL,
  audio_size_bytes INTEGER NOT NULL CHECK (audio_size_bytes > 0 AND audio_size_bytes <= 20971520),
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audio_deleted_at TIMESTAMPTZ,
  UNIQUE (quest_id, student_user_id),
  UNIQUE (quest_id, sequence_number)
);

CREATE TABLE public.study_relay_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.study_relay_submissions(id) ON DELETE CASCADE,
  feedback_author_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (length(trim(comment)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id)
);

CREATE INDEX study_group_members_group_id_idx
  ON public.study_group_members(group_id);

CREATE INDEX study_group_members_student_user_id_idx
  ON public.study_group_members(student_user_id);

CREATE INDEX study_quests_group_id_due_at_idx
  ON public.study_quests(group_id, due_at DESC);

CREATE INDEX study_relay_submissions_quest_sequence_idx
  ON public.study_relay_submissions(quest_id, sequence_number);

CREATE INDEX study_relay_submissions_student_user_id_idx
  ON public.study_relay_submissions(student_user_id);

CREATE INDEX study_relay_feedback_submission_id_idx
  ON public.study_relay_feedback(submission_id);

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_relay_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_relay_feedback ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER study_groups_touch_updated_at
BEFORE UPDATE ON public.study_groups
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER study_quests_touch_updated_at
BEFORE UPDATE ON public.study_quests
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.submit_relay_first_submission(
  p_quest_id UUID,
  p_student_user_id UUID,
  p_audio_path TEXT,
  p_audio_file_name TEXT,
  p_audio_content_type TEXT,
  p_audio_size_bytes INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_submission_id UUID;
BEGIN
  SELECT quests.group_id
  INTO v_group_id
  FROM public.study_quests AS quests
  WHERE quests.id = p_quest_id
    AND quests.status = 'open'
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'relay_quest_not_open';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = v_group_id
      AND student_user_id = p_student_user_id
  ) THEN
    RAISE EXCEPTION 'relay_member_required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.study_relay_submissions
    WHERE quest_id = p_quest_id
  ) THEN
    RAISE EXCEPTION 'relay_already_started';
  END IF;

  INSERT INTO public.study_relay_submissions (
    quest_id,
    student_user_id,
    audio_path,
    audio_file_name,
    audio_content_type,
    audio_size_bytes,
    sequence_number
  )
  VALUES (
    p_quest_id,
    p_student_user_id,
    p_audio_path,
    p_audio_file_name,
    p_audio_content_type,
    p_audio_size_bytes,
    1
  )
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_relay_feedback_and_submission(
  p_quest_id UUID,
  p_student_user_id UUID,
  p_target_submission_id UUID,
  p_comment TEXT,
  p_audio_path TEXT,
  p_audio_file_name TEXT,
  p_audio_content_type TEXT,
  p_audio_size_bytes INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_member_count INTEGER;
  v_submission_count INTEGER;
  v_latest_pending_submission_id UUID;
  v_target_student_user_id UUID;
  v_next_sequence INTEGER;
  v_submission_id UUID;
BEGIN
  SELECT quests.group_id
  INTO v_group_id
  FROM public.study_quests AS quests
  WHERE quests.id = p_quest_id
    AND quests.status = 'open'
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'relay_quest_not_open';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = v_group_id
      AND student_user_id = p_student_user_id
  ) THEN
    RAISE EXCEPTION 'relay_member_required';
  END IF;

  SELECT count(*) INTO v_member_count
  FROM public.study_group_members
  WHERE group_id = v_group_id;

  SELECT count(*) INTO v_submission_count
  FROM public.study_relay_submissions
  WHERE quest_id = p_quest_id;

  IF v_submission_count = 0 THEN
    RAISE EXCEPTION 'relay_first_submission_required';
  END IF;

  IF v_submission_count >= v_member_count THEN
    RAISE EXCEPTION 'relay_final_feedback_required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.study_relay_submissions
    WHERE quest_id = p_quest_id
      AND student_user_id = p_student_user_id
  ) THEN
    RAISE EXCEPTION 'relay_student_already_submitted';
  END IF;

  SELECT submissions.id, submissions.student_user_id
  INTO v_latest_pending_submission_id, v_target_student_user_id
  FROM public.study_relay_submissions AS submissions
  LEFT JOIN public.study_relay_feedback AS feedback
    ON feedback.submission_id = submissions.id
  WHERE submissions.quest_id = p_quest_id
    AND feedback.id IS NULL
  ORDER BY submissions.sequence_number ASC
  LIMIT 1
  FOR UPDATE OF submissions;

  IF v_latest_pending_submission_id IS NULL OR v_latest_pending_submission_id <> p_target_submission_id THEN
    RAISE EXCEPTION 'relay_pending_submission_mismatch';
  END IF;

  IF v_target_student_user_id = p_student_user_id THEN
    RAISE EXCEPTION 'relay_self_feedback_not_allowed';
  END IF;

  INSERT INTO public.study_relay_feedback (
    submission_id,
    feedback_author_user_id,
    comment
  )
  VALUES (
    p_target_submission_id,
    p_student_user_id,
    trim(p_comment)
  );

  SELECT coalesce(max(sequence_number), 0) + 1 INTO v_next_sequence
  FROM public.study_relay_submissions
  WHERE quest_id = p_quest_id;

  INSERT INTO public.study_relay_submissions (
    quest_id,
    student_user_id,
    audio_path,
    audio_file_name,
    audio_content_type,
    audio_size_bytes,
    sequence_number
  )
  VALUES (
    p_quest_id,
    p_student_user_id,
    p_audio_path,
    p_audio_file_name,
    p_audio_content_type,
    p_audio_size_bytes,
    v_next_sequence
  )
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_relay_final_feedback(
  p_quest_id UUID,
  p_student_user_id UUID,
  p_target_submission_id UUID,
  p_comment TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_member_count INTEGER;
  v_submission_count INTEGER;
  v_first_student_user_id UUID;
  v_latest_pending_submission_id UUID;
  v_target_student_user_id UUID;
  v_feedback_id UUID;
BEGIN
  SELECT quests.group_id
  INTO v_group_id
  FROM public.study_quests AS quests
  WHERE quests.id = p_quest_id
    AND quests.status = 'open'
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'relay_quest_not_open';
  END IF;

  SELECT count(*) INTO v_member_count
  FROM public.study_group_members
  WHERE group_id = v_group_id;

  SELECT count(*) INTO v_submission_count
  FROM public.study_relay_submissions
  WHERE quest_id = p_quest_id;

  IF v_submission_count < v_member_count THEN
    RAISE EXCEPTION 'relay_not_all_submitted';
  END IF;

  SELECT student_user_id
  INTO v_first_student_user_id
  FROM public.study_relay_submissions
  WHERE quest_id = p_quest_id
  ORDER BY sequence_number ASC
  LIMIT 1;

  IF v_first_student_user_id IS NULL OR v_first_student_user_id <> p_student_user_id THEN
    RAISE EXCEPTION 'relay_first_uploader_required';
  END IF;

  SELECT submissions.id, submissions.student_user_id
  INTO v_latest_pending_submission_id, v_target_student_user_id
  FROM public.study_relay_submissions AS submissions
  LEFT JOIN public.study_relay_feedback AS feedback
    ON feedback.submission_id = submissions.id
  WHERE submissions.quest_id = p_quest_id
    AND feedback.id IS NULL
  ORDER BY submissions.sequence_number ASC
  LIMIT 1
  FOR UPDATE OF submissions;

  IF v_latest_pending_submission_id IS NULL OR v_latest_pending_submission_id <> p_target_submission_id THEN
    RAISE EXCEPTION 'relay_pending_submission_mismatch';
  END IF;

  IF v_target_student_user_id = p_student_user_id THEN
    RAISE EXCEPTION 'relay_self_feedback_not_allowed';
  END IF;

  INSERT INTO public.study_relay_feedback (
    submission_id,
    feedback_author_user_id,
    comment
  )
  VALUES (
    p_target_submission_id,
    p_student_user_id,
    trim(p_comment)
  )
  RETURNING id INTO v_feedback_id;

  UPDATE public.study_quests
  SET status = 'closed',
      updated_at = now()
  WHERE id = p_quest_id;

  RETURN v_feedback_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_relay_first_submission(UUID, UUID, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_relay_feedback_and_submission(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_relay_final_feedback(UUID, UUID, UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_relay_first_submission(UUID, UUID, TEXT, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_relay_feedback_and_submission(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_relay_final_feedback(UUID, UUID, UUID, TEXT) TO service_role;

INSERT INTO public.study_groups (title, description, status)
VALUES ('Relay Study', 'Default relay study group.', 'active');

CREATE TABLE public.management_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0 AND capacity <= 100),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'canceled')),
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  canceled_at TIMESTAMPTZ,
  canceled_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.management_class_coupon_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_count INTEGER NOT NULL CHECK (total_count > 0 AND total_count <= 100),
  granted_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.management_class_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES public.management_class_coupon_grants(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used')),
  used_application_id UUID,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grant_id, sequence_number)
);

CREATE TABLE public.management_class_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.management_classes(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.management_class_coupons(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  canceled_at TIMESTAMPTZ,
  canceled_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cancel_reason TEXT NOT NULL DEFAULT '' CHECK (char_length(cancel_reason) <= 300)
);

ALTER TABLE public.management_class_coupons
  ADD CONSTRAINT management_class_coupons_used_application_fk
  FOREIGN KEY (used_application_id)
  REFERENCES public.management_class_applications(id)
  ON DELETE SET NULL;

CREATE INDEX management_classes_starts_at_idx
  ON public.management_classes(starts_at);

CREATE INDEX management_class_coupon_grants_student_idx
  ON public.management_class_coupon_grants(student_user_id, created_at);

CREATE INDEX management_class_coupons_student_status_idx
  ON public.management_class_coupons(student_user_id, status, created_at);

CREATE INDEX management_class_applications_class_idx
  ON public.management_class_applications(class_id, applied_at);

CREATE INDEX management_class_applications_student_idx
  ON public.management_class_applications(student_user_id, applied_at);

CREATE UNIQUE INDEX management_class_applications_one_active_per_class_student
  ON public.management_class_applications(class_id, student_user_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX management_class_applications_one_active_per_coupon
  ON public.management_class_applications(coupon_id)
  WHERE status = 'active';

ALTER TABLE public.management_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_class_coupon_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_class_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_class_applications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER management_classes_touch_updated_at
BEFORE UPDATE ON public.management_classes
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.grant_management_class_coupons(
  p_student_user_id UUID,
  p_total_count INTEGER,
  p_granted_by_user_id UUID,
  p_note TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grant_id UUID;
BEGIN
  IF p_total_count IS NULL OR p_total_count < 1 OR p_total_count > 100 THEN
    RAISE EXCEPTION 'management_class_coupon_count_invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_student_user_id
      AND role = 'student'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'management_class_student_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_granted_by_user_id
      AND role = 'admin'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'management_class_admin_required';
  END IF;

  INSERT INTO public.management_class_coupon_grants (
    student_user_id,
    total_count,
    granted_by_user_id,
    note
  )
  VALUES (
    p_student_user_id,
    p_total_count,
    p_granted_by_user_id,
    coalesce(trim(p_note), '')
  )
  RETURNING id INTO v_grant_id;

  INSERT INTO public.management_class_coupons (
    grant_id,
    student_user_id,
    sequence_number
  )
  SELECT v_grant_id, p_student_user_id, generate_series(1, p_total_count);

  RETURN v_grant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_management_class(
  p_class_id UUID,
  p_student_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity INTEGER;
  v_active_count INTEGER;
  v_coupon_id UUID;
  v_application_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_student_user_id
      AND role = 'student'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'management_class_student_required';
  END IF;

  SELECT capacity
  INTO v_capacity
  FROM public.management_classes
  WHERE id = p_class_id
    AND status = 'open'
    AND starts_at > now()
  FOR UPDATE;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'management_class_not_open';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.management_class_applications
    WHERE class_id = p_class_id
      AND student_user_id = p_student_user_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'management_class_already_applied';
  END IF;

  SELECT count(*)
  INTO v_active_count
  FROM public.management_class_applications
  WHERE class_id = p_class_id
    AND status = 'active';

  IF v_active_count >= v_capacity THEN
    RAISE EXCEPTION 'management_class_full';
  END IF;

  SELECT coupons.id
  INTO v_coupon_id
  FROM public.management_class_coupons AS coupons
  JOIN public.management_class_coupon_grants AS grants
    ON grants.id = coupons.grant_id
  WHERE coupons.student_user_id = p_student_user_id
    AND coupons.status = 'available'
  ORDER BY grants.created_at ASC, coupons.sequence_number ASC, coupons.created_at ASC
  LIMIT 1
  FOR UPDATE OF coupons;

  IF v_coupon_id IS NULL THEN
    RAISE EXCEPTION 'management_class_coupon_required';
  END IF;

  INSERT INTO public.management_class_applications (
    class_id,
    student_user_id,
    coupon_id
  )
  VALUES (
    p_class_id,
    p_student_user_id,
    v_coupon_id
  )
  RETURNING id INTO v_application_id;

  UPDATE public.management_class_coupons
  SET status = 'used',
      used_application_id = v_application_id,
      used_at = now()
  WHERE id = v_coupon_id;

  RETURN v_application_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_management_class_application(
  p_application_id UUID,
  p_actor_user_id UUID,
  p_reason TEXT DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role TEXT;
  v_application public.management_class_applications%ROWTYPE;
  v_starts_at TIMESTAMPTZ;
BEGIN
  SELECT role
  INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_user_id
    AND status = 'active';

  IF v_actor_role NOT IN ('admin', 'student') THEN
    RAISE EXCEPTION 'management_class_actor_required';
  END IF;

  SELECT *
  INTO v_application
  FROM public.management_class_applications
  WHERE id = p_application_id
    AND status = 'active'
  FOR UPDATE;

  IF v_application.id IS NULL THEN
    RAISE EXCEPTION 'management_class_application_not_active';
  END IF;

  SELECT starts_at
  INTO v_starts_at
  FROM public.management_classes
  WHERE id = v_application.class_id
  FOR UPDATE;

  IF v_actor_role <> 'admin' AND v_application.student_user_id <> p_actor_user_id THEN
    RAISE EXCEPTION 'management_class_cancel_forbidden';
  END IF;

  IF v_actor_role <> 'admin' AND v_starts_at <= now() + interval '1 hour' THEN
    RAISE EXCEPTION 'management_class_cancel_window_closed';
  END IF;

  UPDATE public.management_class_applications
  SET status = 'canceled',
      canceled_at = now(),
      canceled_by_user_id = p_actor_user_id,
      cancel_reason = coalesce(trim(p_reason), '')
  WHERE id = p_application_id;

  UPDATE public.management_class_coupons
  SET status = 'available',
      used_application_id = NULL,
      used_at = NULL
  WHERE id = v_application.coupon_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_management_class(
  p_class_id UUID,
  p_actor_user_id UUID,
  p_reason TEXT DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role TEXT;
BEGIN
  SELECT role
  INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_user_id
    AND status = 'active';

  IF v_actor_role <> 'admin' THEN
    RAISE EXCEPTION 'management_class_admin_required';
  END IF;

  UPDATE public.management_classes
  SET status = 'canceled',
      canceled_at = now(),
      canceled_by_user_id = p_actor_user_id,
      updated_at = now()
  WHERE id = p_class_id
    AND status <> 'canceled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'management_class_not_found';
  END IF;

  WITH canceled_applications AS (
    UPDATE public.management_class_applications
    SET status = 'canceled',
        canceled_at = now(),
        canceled_by_user_id = p_actor_user_id,
        cancel_reason = coalesce(trim(p_reason), 'class_canceled')
    WHERE class_id = p_class_id
      AND status = 'active'
    RETURNING coupon_id
  )
  UPDATE public.management_class_coupons
  SET status = 'available',
      used_application_id = NULL,
      used_at = NULL
  WHERE id IN (SELECT coupon_id FROM canceled_applications);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_management_class_coupons(UUID, INTEGER, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_management_class(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_management_class_application(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_management_class(UUID, UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.grant_management_class_coupons(UUID, INTEGER, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_management_class(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_management_class_application(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_management_class(UUID, UUID, TEXT) TO service_role;
