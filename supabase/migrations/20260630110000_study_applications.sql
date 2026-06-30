-- 릴레이 스터디 참여 신청과 관리자 승인/거절 처리를 추가한다.

CREATE TABLE public.study_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE SET NULL,
  message TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX study_applications_one_pending_per_student
  ON public.study_applications (student_user_id)
  WHERE status = 'pending';

CREATE INDEX study_applications_status_requested_at_idx
  ON public.study_applications(status, requested_at ASC);

CREATE INDEX study_applications_student_user_id_idx
  ON public.study_applications(student_user_id, requested_at DESC);

ALTER TABLE public.study_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_applications_all_service_role"
  ON public.study_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.approve_study_application(
  p_application_id UUID,
  p_group_id UUID,
  p_resolved_by_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_user_id UUID;
  v_next_display_order INTEGER;
  v_group_title TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_resolved_by_user_id
      AND role = 'admin'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'study_application_admin_required';
  END IF;

  SELECT requests.student_user_id
  INTO v_student_user_id
  FROM public.study_applications AS requests
  WHERE requests.id = p_application_id
    AND requests.status = 'pending'
  FOR UPDATE;

  IF v_student_user_id IS NULL THEN
    RAISE EXCEPTION 'study_application_not_pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = v_student_user_id
      AND role = 'student'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'study_application_student_required';
  END IF;

  SELECT title
  INTO v_group_title
  FROM public.study_groups
  WHERE id = p_group_id
    AND type = 'relay'
    AND status = 'active'
  FOR UPDATE;

  IF v_group_title IS NULL THEN
    RAISE EXCEPTION 'study_application_group_required';
  END IF;

  SELECT coalesce(max(display_order), 0) + 1
  INTO v_next_display_order
  FROM public.study_group_members
  WHERE group_id = p_group_id;

  INSERT INTO public.study_group_members (
    group_id,
    student_user_id,
    display_order
  )
  VALUES (
    p_group_id,
    v_student_user_id,
    v_next_display_order
  )
  ON CONFLICT (group_id, student_user_id) DO NOTHING;

  UPDATE public.study_applications
  SET group_id = p_group_id,
      status = 'approved',
      resolved_at = now(),
      resolved_by_user_id = p_resolved_by_user_id
  WHERE id = p_application_id;

  INSERT INTO public.user_notifications (user_id, type, title, body)
  VALUES (
    v_student_user_id,
    'study_application_approved',
    '릴레이 스터디 신청 승인',
    v_group_title || ' 멤버로 배정되었습니다. 내 스터디에서 새 퀘스트를 확인해 주세요.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_study_application(
  p_application_id UUID,
  p_resolved_by_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_user_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_resolved_by_user_id
      AND role = 'admin'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'study_application_admin_required';
  END IF;

  SELECT requests.student_user_id
  INTO v_student_user_id
  FROM public.study_applications AS requests
  WHERE requests.id = p_application_id
    AND requests.status = 'pending'
  FOR UPDATE;

  IF v_student_user_id IS NULL THEN
    RAISE EXCEPTION 'study_application_not_pending';
  END IF;

  UPDATE public.study_applications
  SET status = 'rejected',
      resolved_at = now(),
      resolved_by_user_id = p_resolved_by_user_id
  WHERE id = p_application_id;

  INSERT INTO public.user_notifications (user_id, type, title, body)
  VALUES (
    v_student_user_id,
    'study_application_rejected',
    '릴레이 스터디 신청 안내',
    '이번 릴레이 스터디 신청은 승인되지 않았습니다. 필요하면 메모를 보완해 다시 신청해 주세요.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_study_application(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_study_application(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_study_application(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_study_application(UUID, UUID) TO service_role;
