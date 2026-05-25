-- Add missing fields to practice_scripts table
ALTER TABLE public.practice_scripts
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT '일반',
ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT '보통' CHECK (difficulty IN ('쉬움', '보통', '어려움')),
ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS length INTEGER NOT NULL DEFAULT 0;
