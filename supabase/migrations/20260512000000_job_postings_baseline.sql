-- Baseline schema for job postings.
-- Earlier production data had this table before tracked incremental migrations.
-- Local resets need the baseline so later migrations can be replayed from an empty database.

CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  source TEXT NOT NULL CHECK (
    source IN (
      'mediajob_announcer',
      'mediajob_reporter',
      'mediajob_intern',
      'arang',
      'saramin',
      'jobkorea',
      'custom'
    )
  ),
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  deadline TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_job_postings_status_created_at
  ON public.job_postings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_postings_source_created_at
  ON public.job_postings (source, created_at DESC);
