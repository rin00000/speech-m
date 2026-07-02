-- Optimize /jobs listing filters and facet counts.

CREATE INDEX IF NOT EXISTS idx_job_postings_status_deadline_created_at
  ON public.job_postings (status, deadline, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_postings_status_deadline_published_at
  ON public.job_postings (status, deadline, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_postings_source_deadline_created_at
  ON public.job_postings (source, deadline, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_job_posting_facets(
  p_today_iso TEXT,
  p_status TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_show_rejected BOOLEAN DEFAULT FALSE,
  p_query TEXT DEFAULT NULL
)
RETURNS TABLE(kind TEXT, key TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_jobs AS (
    SELECT status, source
    FROM public.job_postings
    WHERE (deadline IS NULL OR deadline >= p_today_iso)
      AND (
        NULLIF(BTRIM(COALESCE(p_query, '')), '') IS NULL
        OR title ILIKE '%' || BTRIM(p_query) || '%'
        OR COALESCE(company, '') ILIKE '%' || BTRIM(p_query) || '%'
      )
  ),
  status_scope AS (
    SELECT status, source
    FROM active_jobs
    WHERE (p_source IS NULL OR source = p_source)
  ),
  source_scope AS (
    SELECT status, source
    FROM active_jobs
    WHERE (p_status IS NULL OR status = p_status)
      AND (p_status IS NOT NULL OR p_show_rejected OR status <> 'rejected')
  )
  SELECT 'status'::TEXT AS kind, 'all'::TEXT AS key, COUNT(*)::BIGINT AS count
  FROM status_scope
  UNION ALL
  SELECT 'status'::TEXT AS kind, status AS key, COUNT(*)::BIGINT AS count
  FROM status_scope
  GROUP BY status
  UNION ALL
  SELECT 'source'::TEXT AS kind, 'all'::TEXT AS key, COUNT(*)::BIGINT AS count
  FROM source_scope
  UNION ALL
  SELECT 'source'::TEXT AS kind, source AS key, COUNT(*)::BIGINT AS count
  FROM source_scope
  GROUP BY source;
$$;

REVOKE ALL ON FUNCTION public.get_job_posting_facets(TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_job_posting_facets(TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO service_role;
