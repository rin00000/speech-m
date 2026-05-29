/**
 * 상세 검증 결과에 따라 공고를 삭제하거나 검증 시각을 갱신하는 DB mutation.
 * 네트워크 판정 로직과 분리해 테스트 대역을 좁힌다.
 */

import type {
  AdminClient,
  ExpiredDetailCandidate,
  ExpiredDetailRemovalResult,
} from "./expired-detail-types";

const MUTATION_CHUNK = 200;

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

export async function removeExpiredDetailJobs(
  supabase: AdminClient,
  jobs: readonly ExpiredDetailCandidate[],
): Promise<ExpiredDetailRemovalResult> {
  const uniqueJobs = [
    ...new Map(jobs.map((job) => [job.id, job])).values(),
  ].filter((job) => job.source_url.trim());
  if (!uniqueJobs.length) return { blocked: 0, deleted: 0 };

  const rows = uniqueJobs.map((job) => ({
    source_url: job.source_url,
    reason: "ttl_purge",
  }));

  for (const part of chunk(rows, MUTATION_CHUNK)) {
    const { error } = await supabase
      .from("crawl_blocked_source_urls")
      .upsert(part, { onConflict: "source_url", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  const ids = uniqueJobs.map((job) => job.id);
  let deleted = 0;
  for (const part of chunk(ids, MUTATION_CHUNK)) {
    const { error } = await supabase.from("job_postings").delete().in("id", part);
    if (error) throw new Error(error.message);
    deleted += part.length;
  }

  return { blocked: rows.length, deleted };
}

export async function touchExpiredDetailJobs(
  supabase: AdminClient,
  jobs: readonly ExpiredDetailCandidate[],
  verifiedAt: string = new Date().toISOString(),
): Promise<number> {
  const ids = [...new Set(jobs.map((job) => job.id).filter(Boolean))];
  if (!ids.length) return 0;

  let touched = 0;
  for (const part of chunk(ids, MUTATION_CHUNK)) {
    const { error } = await supabase
      .from("job_postings")
      .update({ detail_verified_at: verifiedAt })
      .in("id", part);
    if (error) throw new Error(error.message);
    touched += part.length;
  }
  return touched;
}
