-- 수강생 인앱 알림 테이블 및 관리반 공지 취소 시 알림 발송 기능 추가

CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (char_length(type) <= 100),
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 1000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_notifications_user_id_read_at_idx
  ON public.user_notifications(user_id, read_at, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 조회 가능 (service_role은 아래 policy로 처리)
CREATE POLICY "user_notifications_select_own"
  ON public.user_notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT u.id
      FROM public.users u
      JOIN public.user_auth_identities i ON i.user_id = u.id
      WHERE i.provider_email = auth.jwt() ->> 'email'
         OR u.id::text = (auth.uid())::text
    )
  );

-- 본인 알림 읽음 처리(UPDATE) 가능
CREATE POLICY "user_notifications_update_own"
  ON public.user_notifications
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT u.id
      FROM public.users u
      JOIN public.user_auth_identities i ON i.user_id = u.id
      WHERE i.provider_email = auth.jwt() ->> 'email'
         OR u.id::text = (auth.uid())::text
    )
  );

-- service_role 전체 접근
CREATE POLICY "user_notifications_all_service_role"
  ON public.user_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- cancel_management_class RPC 업데이트: 취소된 수강생에게 알림 INSERT
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
  v_starts_at TIMESTAMPTZ;
  v_starts_at_label TEXT;
  r_app RECORD;
BEGIN
  SELECT role
  INTO v_actor_role
  FROM public.users
  WHERE id = p_actor_user_id
    AND status = 'active';

  IF v_actor_role <> 'admin' THEN
    RAISE EXCEPTION 'management_class_admin_required';
  END IF;

  SELECT starts_at
  INTO v_starts_at
  FROM public.management_classes
  WHERE id = p_class_id
    AND status <> 'canceled'
  FOR UPDATE;

  IF v_starts_at IS NULL THEN
    RAISE EXCEPTION 'management_class_not_found';
  END IF;

  UPDATE public.management_classes
  SET status = 'canceled',
      canceled_at = now(),
      canceled_by_user_id = p_actor_user_id,
      updated_at = now()
  WHERE id = p_class_id;

  -- 날짜 포맷: "M월 D일 HH:MM" (KST = UTC+9)
  v_starts_at_label := to_char(
    v_starts_at AT TIME ZONE 'Asia/Seoul',
    'FMMM월 FMDD일 HH24:MI'
  );

  -- 신청 수강생별 처리: 쿠폰 복구 + 알림 INSERT
  FOR r_app IN
    SELECT id, student_user_id, coupon_id
    FROM public.management_class_applications
    WHERE class_id = p_class_id
      AND status = 'active'
    FOR UPDATE
  LOOP
    -- 신청 취소
    UPDATE public.management_class_applications
    SET status = 'canceled',
        canceled_at = now(),
        canceled_by_user_id = p_actor_user_id,
        cancel_reason = coalesce(trim(p_reason), 'class_canceled')
    WHERE id = r_app.id;

    -- 쿠폰 복구
    UPDATE public.management_class_coupons
    SET status = 'available',
        used_application_id = NULL,
        used_at = NULL
    WHERE id = r_app.coupon_id;

    -- 알림 발송
    INSERT INTO public.user_notifications (user_id, type, title, body)
    VALUES (
      r_app.student_user_id,
      'management_class_canceled',
      '관리반 예약 취소 안내',
      v_starts_at_label || ' 관리반 공지가 취소되어 사용하셨던 쿠폰이 복구되었습니다.'
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_management_class(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_management_class(UUID, UUID, TEXT) TO service_role;
