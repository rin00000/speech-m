-- Management class reservations: offline coupon grants, first-come applications, and cancellation rules.

CREATE TABLE IF NOT EXISTS public.management_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0 AND capacity <= 100),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'canceled')),
  created_by TEXT REFERENCES public.user_profiles(email) ON DELETE SET NULL,
  canceled_at TIMESTAMPTZ,
  canceled_by TEXT REFERENCES public.user_profiles(email) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.management_class_coupon_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email TEXT NOT NULL REFERENCES public.user_profiles(email) ON DELETE CASCADE,
  total_count INTEGER NOT NULL CHECK (total_count > 0 AND total_count <= 100),
  granted_by TEXT REFERENCES public.user_profiles(email) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.management_class_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES public.management_class_coupon_grants(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL REFERENCES public.user_profiles(email) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used')),
  used_application_id UUID,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grant_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS public.management_class_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.management_classes(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL REFERENCES public.user_profiles(email) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.management_class_coupons(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  canceled_at TIMESTAMPTZ,
  canceled_by TEXT REFERENCES public.user_profiles(email) ON DELETE SET NULL,
  cancel_reason TEXT NOT NULL DEFAULT '' CHECK (char_length(cancel_reason) <= 300)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'management_class_coupons_used_application_fk'
  ) THEN
    ALTER TABLE public.management_class_coupons
      ADD CONSTRAINT management_class_coupons_used_application_fk
      FOREIGN KEY (used_application_id)
      REFERENCES public.management_class_applications(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS management_classes_starts_at_idx
  ON public.management_classes(starts_at);

CREATE INDEX IF NOT EXISTS management_class_coupon_grants_student_idx
  ON public.management_class_coupon_grants(student_email, created_at);

CREATE INDEX IF NOT EXISTS management_class_coupons_student_status_idx
  ON public.management_class_coupons(student_email, status, created_at);

CREATE INDEX IF NOT EXISTS management_class_applications_class_idx
  ON public.management_class_applications(class_id, applied_at);

CREATE INDEX IF NOT EXISTS management_class_applications_student_idx
  ON public.management_class_applications(student_email, applied_at);

CREATE UNIQUE INDEX IF NOT EXISTS management_class_applications_one_active_per_class_student
  ON public.management_class_applications(class_id, student_email)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS management_class_applications_one_active_per_coupon
  ON public.management_class_applications(coupon_id)
  WHERE status = 'active';

ALTER TABLE public.management_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_class_coupon_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_class_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_class_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "management_classes_select_student_open"
  ON public.management_classes
  FOR SELECT
  TO authenticated
  USING (
    status = 'open'
    AND starts_at > now()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role = 'student'
    )
  );

CREATE POLICY "management_classes_all_admin"
  ON public.management_classes
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

CREATE POLICY "management_class_coupon_grants_select_own"
  ON public.management_class_coupon_grants
  FOR SELECT
  TO authenticated
  USING (student_email = auth.jwt() ->> 'email');

CREATE POLICY "management_class_coupon_grants_all_admin"
  ON public.management_class_coupon_grants
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

CREATE POLICY "management_class_coupons_select_own"
  ON public.management_class_coupons
  FOR SELECT
  TO authenticated
  USING (student_email = auth.jwt() ->> 'email');

CREATE POLICY "management_class_coupons_all_admin"
  ON public.management_class_coupons
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

CREATE POLICY "management_class_applications_select_own"
  ON public.management_class_applications
  FOR SELECT
  TO authenticated
  USING (student_email = auth.jwt() ->> 'email');

CREATE POLICY "management_class_applications_all_admin"
  ON public.management_class_applications
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

CREATE OR REPLACE FUNCTION public.grant_management_class_coupons(
  p_student_email TEXT,
  p_total_count INTEGER,
  p_granted_by TEXT,
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
    SELECT 1 FROM public.user_profiles
    WHERE email = p_student_email
      AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'management_class_student_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE email = p_granted_by
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'management_class_admin_required';
  END IF;

  INSERT INTO public.management_class_coupon_grants (
    student_email,
    total_count,
    granted_by,
    note
  )
  VALUES (
    p_student_email,
    p_total_count,
    p_granted_by,
    coalesce(trim(p_note), '')
  )
  RETURNING id INTO v_grant_id;

  INSERT INTO public.management_class_coupons (
    grant_id,
    student_email,
    sequence_number
  )
  SELECT v_grant_id, p_student_email, generate_series(1, p_total_count);

  RETURN v_grant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_management_class(
  p_class_id UUID,
  p_student_email TEXT
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
    SELECT 1 FROM public.user_profiles
    WHERE email = p_student_email
      AND role = 'student'
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
      AND student_email = p_student_email
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
  WHERE coupons.student_email = p_student_email
    AND coupons.status = 'available'
  ORDER BY grants.created_at ASC, coupons.sequence_number ASC, coupons.created_at ASC
  LIMIT 1
  FOR UPDATE OF coupons;

  IF v_coupon_id IS NULL THEN
    RAISE EXCEPTION 'management_class_coupon_required';
  END IF;

  INSERT INTO public.management_class_applications (
    class_id,
    student_email,
    coupon_id
  )
  VALUES (
    p_class_id,
    p_student_email,
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
  p_actor_email TEXT,
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
  FROM public.user_profiles
  WHERE email = p_actor_email;

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

  IF v_actor_role <> 'admin' AND v_application.student_email <> p_actor_email THEN
    RAISE EXCEPTION 'management_class_cancel_forbidden';
  END IF;

  IF v_actor_role <> 'admin' AND v_starts_at <= now() + interval '1 hour' THEN
    RAISE EXCEPTION 'management_class_cancel_window_closed';
  END IF;

  UPDATE public.management_class_applications
  SET status = 'canceled',
      canceled_at = now(),
      canceled_by = p_actor_email,
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
  p_actor_email TEXT,
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
  FROM public.user_profiles
  WHERE email = p_actor_email;

  IF v_actor_role <> 'admin' THEN
    RAISE EXCEPTION 'management_class_admin_required';
  END IF;

  UPDATE public.management_classes
  SET status = 'canceled',
      canceled_at = now(),
      canceled_by = p_actor_email,
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
        canceled_by = p_actor_email,
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

DROP TRIGGER IF EXISTS management_classes_touch_updated_at ON public.management_classes;
CREATE TRIGGER management_classes_touch_updated_at
BEFORE UPDATE ON public.management_classes
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON FUNCTION public.grant_management_class_coupons(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_management_class(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_management_class_application(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_management_class(UUID, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.grant_management_class_coupons(TEXT, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_management_class(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_management_class_application(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_management_class(UUID, TEXT, TEXT) TO service_role;
