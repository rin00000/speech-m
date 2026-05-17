import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkForInQuery, BLOCKED_URL_IN_QUERY_CHUNK } from "@/lib/crawl/blocked-source-urls";
import { FINGERPRINT_IN_QUERY_CHUNK, isDeadlineActiveForDedup } from "@/lib/crawl/fingerprint";
import type { CrossSourceDedupJob } from "@/lib/crawl/cross-source-dedup";
import type { Database, JobStatus } from "@/types/database.types";

const COMPANY_IN_QUERY_CHUNK = 40;
const CROSS_SOURCE_DEDUP_LOOKBACK_DAYS = 30;

type AdminClient = SupabaseClient<Database>;

/**
 * 주어진 URL 중 `job_postings`에 이미 존재하는 것만 모은다(조기 중단 카운터용).
 */
export async function fetchExistingSourceUrls(
  supabase: AdminClient,
  sourceUrls: readonly string[]
): Promise<Set<string>> {
  const unique = [...new Set(sourceUrls.map((u) => u.trim()).filter(Boolean))];
  const out = new Set<string>();
  if (!unique.length) return out;

  for (const chunk of chunkForInQuery(unique, BLOCKED_URL_IN_QUERY_CHUNK)) {
    const { data, error } = await supabase
      .from("job_postings")
      .select("source_url")
      .in("source_url", chunk)
      .returns<{ source_url: string }[]>();

    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      out.add(row.source_url);
    }
  }
  return out;
}

export type ExistingJobPostingRow = Pick<
  Database["public"]["Tables"]["job_postings"]["Row"],
  "id" | "source_url" | "title" | "company" | "location" | "deadline" | "fingerprint" | "status"
>;

/**
 * 이번 크롤에 등장한 URL에 대한 기존 행(배치 insert/update 분기).
 */
export async function fetchExistingJobRowsBySourceUrl(
  supabase: AdminClient,
  sourceUrls: readonly string[]
): Promise<Map<string, ExistingJobPostingRow>> {
  const unique = [...new Set(sourceUrls.map((u) => u.trim()).filter(Boolean))];
  const map = new Map<string, ExistingJobPostingRow>();
  if (!unique.length) return map;

  for (const chunk of chunkForInQuery(unique, BLOCKED_URL_IN_QUERY_CHUNK)) {
    const { data, error } = await supabase
      .from("job_postings")
      .select("id, source_url, title, company, location, deadline, fingerprint, status")
      .in("source_url", chunk)
      .returns<ExistingJobPostingRow[]>();

    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      map.set(row.source_url, row);
    }
  }
  return map;
}

type FingerprintDeadlineRow = Pick<
  Database["public"]["Tables"]["job_postings"]["Row"],
  "fingerprint" | "deadline"
>;

/**
 * 지문이 일치하는 기존 행을 배치로 가져온 뒤, 호출 측에서 `isDeadlineActiveForDedup`으로 필터한다.
 */
export async function fetchJobRowsByFingerprints(
  supabase: AdminClient,
  fingerprints: readonly string[]
): Promise<FingerprintDeadlineRow[]> {
  const unique = [...new Set(fingerprints.map((f) => f.trim()).filter(Boolean))];
  const out: FingerprintDeadlineRow[] = [];
  if (!unique.length) return out;

  for (const chunk of chunkForInQuery(unique, FINGERPRINT_IN_QUERY_CHUNK)) {
    const { data, error } = await supabase
      .from("job_postings")
      .select("fingerprint, deadline, status")
      .in("fingerprint", chunk);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as {
      fingerprint: string | null;
      deadline: string | null;
      status: JobStatus;
    }[];
    for (const row of rows) {
      if (row.fingerprint == null || row.fingerprint === "") continue;
      if (row.status !== "pending" && row.status !== "approved") continue;
      out.push({ fingerprint: row.fingerprint, deadline: row.deadline });
    }
  }
  return out;
}

export type CrossSourceDedupCandidate = CrossSourceDedupJob & {
  deadline: string | null;
  created_at: string;
};

/**
 * 교차 소스 fuzzy 중복 비교용 후보.
 * 전 status, `created_at` 30일 이내 또는 유효 마감만 포함.
 */
export async function fetchCrossSourceDedupCandidates(
  supabase: AdminClient,
  companies: readonly string[],
  now: Date = new Date()
): Promise<CrossSourceDedupCandidate[]> {
  const unique = [...new Set(companies.map((c) => c.trim()).filter(Boolean))];
  if (!unique.length) return [];

  const lookback = new Date(now);
  lookback.setDate(lookback.getDate() - CROSS_SOURCE_DEDUP_LOOKBACK_DAYS);
  const lookbackIso = lookback.toISOString();

  const out: CrossSourceDedupCandidate[] = [];

  for (const chunk of chunkForInQuery(unique, COMPANY_IN_QUERY_CHUNK)) {
    const { data, error } = await supabase
      .from("job_postings")
      .select("company, title, location, source_url, deadline, created_at")
      .in("company", chunk)
      .returns<
        Pick<
          Database["public"]["Tables"]["job_postings"]["Row"],
          "company" | "title" | "location" | "source_url" | "deadline" | "created_at"
        >[]
      >();

    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      if (!row.title?.trim() || !row.source_url?.trim()) continue;
      const recentEnough = row.created_at >= lookbackIso;
      const deadlineActive = isDeadlineActiveForDedup(row.deadline);
      if (!recentEnough && !deadlineActive) continue;

      out.push({
        company: row.company,
        title: row.title,
        location: row.location,
        source_url: row.source_url,
        deadline: row.deadline,
        created_at: row.created_at,
      });
    }
  }

  return out;
}
