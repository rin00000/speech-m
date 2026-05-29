-- Relay study MVP: groups, quests, strict relay submissions, feedback, and private audio storage.

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

CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'relay' CHECK (type IN ('relay')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by TEXT REFERENCES public.user_profiles(email) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL REFERENCES public.user_profiles(email) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, student_email)
);

CREATE TABLE IF NOT EXISTS public.study_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  script_title TEXT NOT NULL,
  script_content TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by TEXT REFERENCES public.user_profiles(email) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_relay_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.study_quests(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL REFERENCES public.user_profiles(email) ON DELETE CASCADE,
  audio_path TEXT NOT NULL,
  audio_file_name TEXT NOT NULL,
  audio_content_type TEXT NOT NULL,
  audio_size_bytes INTEGER NOT NULL CHECK (audio_size_bytes > 0 AND audio_size_bytes <= 20971520),
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audio_deleted_at TIMESTAMPTZ,
  UNIQUE (quest_id, student_email),
  UNIQUE (quest_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS public.study_relay_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.study_relay_submissions(id) ON DELETE CASCADE,
  feedback_author_email TEXT NOT NULL REFERENCES public.user_profiles(email) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (length(trim(comment)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id)
);

CREATE INDEX IF NOT EXISTS study_group_members_group_id_idx
  ON public.study_group_members(group_id);

CREATE INDEX IF NOT EXISTS study_group_members_student_email_idx
  ON public.study_group_members(student_email);

CREATE INDEX IF NOT EXISTS study_quests_group_id_due_at_idx
  ON public.study_quests(group_id, due_at DESC);

CREATE INDEX IF NOT EXISTS study_relay_submissions_quest_sequence_idx
  ON public.study_relay_submissions(quest_id, sequence_number);

CREATE INDEX IF NOT EXISTS study_relay_feedback_submission_id_idx
  ON public.study_relay_feedback(submission_id);

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_relay_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_relay_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_groups_select_authorized"
  ON public.study_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE study_group_members.group_id = study_groups.id
        AND study_group_members.student_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "study_groups_all_admin"
  ON public.study_groups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "study_group_members_select_authorized"
  ON public.study_group_members
  FOR SELECT
  TO authenticated
  USING (
    student_email = auth.jwt() ->> 'email'
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "study_group_members_all_admin"
  ON public.study_group_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "study_quests_select_authorized"
  ON public.study_quests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE study_group_members.group_id = study_quests.group_id
        AND study_group_members.student_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "study_quests_all_admin"
  ON public.study_quests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "study_relay_submissions_select_authorized"
  ON public.study_relay_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.study_quests
      JOIN public.study_group_members
        ON study_group_members.group_id = study_quests.group_id
      WHERE study_quests.id = study_relay_submissions.quest_id
        AND study_group_members.student_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "study_relay_feedback_select_authorized"
  ON public.study_relay_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.study_relay_submissions
      JOIN public.study_quests
        ON study_quests.id = study_relay_submissions.quest_id
      JOIN public.study_group_members
        ON study_group_members.group_id = study_quests.group_id
      WHERE study_relay_submissions.id = study_relay_feedback.submission_id
        AND study_group_members.student_email = auth.jwt() ->> 'email'
    )
  );

CREATE OR REPLACE FUNCTION public.submit_relay_first_submission(
  p_quest_id UUID,
  p_student_email TEXT,
  p_audio_path TEXT,
  p_audio_file_name TEXT,
  p_audio_content_type TEXT,
  p_audio_size_bytes INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_id UUID;
  v_submission_id UUID;
BEGIN
  SELECT group_id INTO v_group_id
  FROM public.study_quests
  WHERE id = p_quest_id
    AND status = 'open'
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'relay_quest_not_open';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = v_group_id
      AND student_email = p_student_email
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
    student_email,
    audio_path,
    audio_file_name,
    audio_content_type,
    audio_size_bytes,
    sequence_number
  )
  VALUES (
    p_quest_id,
    p_student_email,
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
  p_student_email TEXT,
  p_target_submission_id UUID,
  p_comment TEXT,
  p_audio_path TEXT,
  p_audio_file_name TEXT,
  p_audio_content_type TEXT,
  p_audio_size_bytes INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_id UUID;
  v_member_count INTEGER;
  v_submission_count INTEGER;
  v_latest_pending_submission_id UUID;
  v_target_student_email TEXT;
  v_next_sequence INTEGER;
  v_submission_id UUID;
BEGIN
  SELECT group_id INTO v_group_id
  FROM public.study_quests
  WHERE id = p_quest_id
    AND status = 'open'
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'relay_quest_not_open';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = v_group_id
      AND student_email = p_student_email
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
      AND student_email = p_student_email
  ) THEN
    RAISE EXCEPTION 'relay_student_already_submitted';
  END IF;

  SELECT submissions.id, submissions.student_email
  INTO v_latest_pending_submission_id, v_target_student_email
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

  IF v_target_student_email = p_student_email THEN
    RAISE EXCEPTION 'relay_self_feedback_not_allowed';
  END IF;

  INSERT INTO public.study_relay_feedback (
    submission_id,
    feedback_author_email,
    comment
  )
  VALUES (
    p_target_submission_id,
    p_student_email,
    trim(p_comment)
  );

  SELECT coalesce(max(sequence_number), 0) + 1 INTO v_next_sequence
  FROM public.study_relay_submissions
  WHERE quest_id = p_quest_id;

  INSERT INTO public.study_relay_submissions (
    quest_id,
    student_email,
    audio_path,
    audio_file_name,
    audio_content_type,
    audio_size_bytes,
    sequence_number
  )
  VALUES (
    p_quest_id,
    p_student_email,
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
  p_student_email TEXT,
  p_target_submission_id UUID,
  p_comment TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_id UUID;
  v_member_count INTEGER;
  v_submission_count INTEGER;
  v_first_student_email TEXT;
  v_latest_pending_submission_id UUID;
  v_target_student_email TEXT;
  v_feedback_id UUID;
BEGIN
  SELECT group_id INTO v_group_id
  FROM public.study_quests
  WHERE id = p_quest_id
    AND status = 'open'
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

  SELECT student_email INTO v_first_student_email
  FROM public.study_relay_submissions
  WHERE quest_id = p_quest_id
  ORDER BY sequence_number ASC
  LIMIT 1;

  IF v_first_student_email IS NULL OR v_first_student_email <> p_student_email THEN
    RAISE EXCEPTION 'relay_first_uploader_required';
  END IF;

  SELECT submissions.id, submissions.student_email
  INTO v_latest_pending_submission_id, v_target_student_email
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

  IF v_target_student_email = p_student_email THEN
    RAISE EXCEPTION 'relay_self_feedback_not_allowed';
  END IF;

  INSERT INTO public.study_relay_feedback (
    submission_id,
    feedback_author_email,
    comment
  )
  VALUES (
    p_target_submission_id,
    p_student_email,
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

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS study_groups_touch_updated_at ON public.study_groups;
CREATE TRIGGER study_groups_touch_updated_at
BEFORE UPDATE ON public.study_groups
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS study_quests_touch_updated_at ON public.study_quests;
CREATE TRIGGER study_quests_touch_updated_at
BEFORE UPDATE ON public.study_quests
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.study_groups (title, description, status)
SELECT '릴레이 스터디', '학생끼리 음성 과제를 듣고 피드백을 이어가는 기본 릴레이 스터디입니다.', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.study_groups
  WHERE type = 'relay'
    AND title = '릴레이 스터디'
);
