-- 수강생 등업 문의 요청과 원장 승인 처리를 위한 테이블 및 원자 승인 함수
CREATE TABLE IF NOT EXISTS public.student_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES public.user_profiles(email) ON DELETE CASCADE,
  display_name TEXT,
  message TEXT NOT NULL DEFAULT '' CHECK (char_length(message) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES public.user_profiles(email) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS student_upgrade_requests_one_pending_per_email
  ON public.student_upgrade_requests (email)
  WHERE status = 'pending';

ALTER TABLE public.student_upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_upgrade_requests_select_own"
  ON public.student_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "student_upgrade_requests_insert_own_pending"
  ON public.student_upgrade_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    email = auth.jwt() ->> 'email'
    AND status = 'pending'
    AND resolved_at IS NULL
    AND resolved_by IS NULL
  );

CREATE POLICY "student_upgrade_requests_select_admin"
  ON public.student_upgrade_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "student_upgrade_requests_update_admin"
  ON public.student_upgrade_requests
  FOR UPDATE
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

CREATE OR REPLACE FUNCTION public.approve_student_upgrade_request(
  p_request_id UUID,
  p_resolved_by TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_email TEXT;
BEGIN
  SELECT email
  INTO target_email
  FROM public.student_upgrade_requests
  WHERE id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF target_email IS NULL THEN
    RAISE EXCEPTION 'student_upgrade_request_not_pending';
  END IF;

  UPDATE public.user_profiles
  SET role = 'student',
      updated_at = now()
  WHERE email = target_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_upgrade_request_user_not_found';
  END IF;

  UPDATE public.student_upgrade_requests
  SET status = 'approved',
      resolved_at = now(),
      resolved_by = p_resolved_by
  WHERE id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_student_upgrade_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_student_upgrade_request(UUID, TEXT) TO service_role;
