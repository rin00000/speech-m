import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkForInQuery, BLOCKED_URL_IN_QUERY_CHUNK } from "@/lib/crawl/blocked-source-urls";
import { FINGERPRINT_IN_QUERY_CHUNK } from "@/lib/crawl/fingerprint";
import type { Database, JobStatus } from "@/types/database.types";

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
