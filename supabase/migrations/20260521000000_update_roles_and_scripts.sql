-- 1. 기존 user_profiles의 role CHECK 제약조건 수정 ('guest' 추가 및 기본값 설정)
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('admin', 'student', 'guest'));
ALTER TABLE public.user_profiles ALTER COLUMN role SET DEFAULT 'guest';

-- 2. 신규 테이블: 수강생 전용 연습/포트폴리오 원고 테이블 생성
CREATE TABLE IF NOT EXISTS public.practice_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('practice', 'portfolio')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.practice_scripts ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
-- A. 조회 권한 (SELECT): 관리자(admin)와 수강생(student)만 조회 가능
CREATE POLICY "practice_scripts_select_authorized"
  ON public.practice_scripts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.email = auth.jwt() ->> 'email'
        AND user_profiles.role IN ('admin', 'student')
    )
  );

-- B. 수정 권한 (ALL): 관리자(admin)만 삽입, 수정, 삭제 가능
CREATE POLICY "practice_scripts_all_admin"
  ON public.practice_scripts
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

-- 3. job_postings의 RLS 정책 보완 (Guest/비로그인도 승인된 공고를 SELECT할 수 있도록 허용)
-- (이미 존재할 수 있는 다른 정책과 충돌하지 않도록 명명)
CREATE POLICY "job_postings_select_approved_public"
  ON public.job_postings
  FOR SELECT
  USING (status = 'approved');
