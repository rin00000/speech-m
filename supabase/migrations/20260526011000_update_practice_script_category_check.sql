-- practice_scripts 테이블의 category CHECK 제약조건 업데이트 (designated 추가)
ALTER TABLE public.practice_scripts DROP CONSTRAINT IF EXISTS practice_scripts_category_check;
ALTER TABLE public.practice_scripts ADD CONSTRAINT practice_scripts_category_check CHECK (category IN ('practice', 'portfolio', 'designated'));
