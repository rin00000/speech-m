-- Recheck relay quest deadlines inside the locked RPC transaction.

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
  v_due_at TIMESTAMPTZ;
  v_submission_id UUID;
BEGIN
  SELECT quests.group_id, quests.due_at
  INTO v_group_id, v_due_at
  FROM public.study_quests AS quests
  WHERE quests.id = p_quest_id
    AND quests.status = 'open'
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'relay_quest_not_open';
  END IF;

  IF v_due_at < now() THEN
    RAISE EXCEPTION 'relay_quest_overdue';
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
  v_due_at TIMESTAMPTZ;
  v_member_count INTEGER;
  v_submission_count INTEGER;
  v_latest_pending_submission_id UUID;
  v_target_student_user_id UUID;
  v_next_sequence INTEGER;
  v_submission_id UUID;
BEGIN
  SELECT quests.group_id, quests.due_at
  INTO v_group_id, v_due_at
  FROM public.study_quests AS quests
  WHERE quests.id = p_quest_id
    AND quests.status = 'open'
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'relay_quest_not_open';
  END IF;

  IF v_due_at < now() THEN
    RAISE EXCEPTION 'relay_quest_overdue';
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
  v_due_at TIMESTAMPTZ;
  v_member_count INTEGER;
  v_submission_count INTEGER;
  v_first_student_user_id UUID;
  v_latest_pending_submission_id UUID;
  v_target_student_user_id UUID;
  v_feedback_id UUID;
BEGIN
  SELECT quests.group_id, quests.due_at
  INTO v_group_id, v_due_at
  FROM public.study_quests AS quests
  WHERE quests.id = p_quest_id
    AND quests.status = 'open'
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'relay_quest_not_open';
  END IF;

  IF v_due_at < now() THEN
    RAISE EXCEPTION 'relay_quest_overdue';
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
