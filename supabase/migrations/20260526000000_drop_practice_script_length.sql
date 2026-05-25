-- practice_scripts 테이블에서 사용하지 않는 length 컬럼 제거
ALTER TABLE public.practice_scripts DROP COLUMN IF EXISTS length;
