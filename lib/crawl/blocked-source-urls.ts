import { createAdminClient } from "@/lib/supabase/server";
import type { JobInsert } from "@/lib/crawl/shared";

/** PostgREST `in(...)` URL length safety; tune if needed. */
export const BLOCKED_URL_IN_QUERY_CHUNK = 150;

/** `in("col", ids)` style chunking for tests and callers. */
export function chunkForInQuery<T>(items: readonly T[], maxChunkSize: number): T[][] {
  if (maxChunkSize < 1) throw new Error("maxChunkSize must be >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += maxChunkSize) {
    out.push(items.slice(i, i + maxChunkSize));
  }
  return out;
}

export type BlockedUrlReason = "manual_delete" | "ttl_purge";

/**
 * Idempotent: existing `source_url` rows are left unchanged (`ignoreDuplicates`).
 */
export async function addBlockedSourceUrls(
  urls: readonly string[],
  options?: { reason?: BlockedUrlReason }
): Promise<void> {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  if (!unique.length) return;

  const supabase = createAdminClient();
  const reason = options?.reason;
  const rows = unique.map((source_url) =>
    reason ? { source_url, reason } : { source_url }
  );

  const INSERT_CHUNK = 300;
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    const { error } = await supabase
      .from("crawl_blocked_source_urls")
      .upsert(chunk, { onConflict: "source_url", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
}

/**
 * Drops jobs whose `source_url` exists in `crawl_blocked_source_urls`.
 */
export async function filterBlockedFromJobs(jobs: readonly JobInsert[]): Promise<JobInsert[]> {
  if (!jobs.length) return [];

  const urls = [...new Set(jobs.map((j) => j.source_url.trim()).filter(Boolean))];
  if (!urls.length) return [...jobs];

  const supabase = createAdminClient();
  const blocked = new Set<string>();

  for (const chunk of chunkForInQuery(urls, BLOCKED_URL_IN_QUERY_CHUNK)) {
    const { data, error } = await supabase
      .from("crawl_blocked_source_urls")
      .select("source_url")
      .in("source_url", chunk)
      .returns<{ source_url: string }[]>();

    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      blocked.add(row.source_url);
    }
  }

  return jobs.filter((j) => !blocked.has(j.source_url));
}
