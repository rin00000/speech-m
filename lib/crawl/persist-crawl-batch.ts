import type { SupabaseClient } from "@supabase/supabase-js";
import { filterBlockedFromJobs } from "@/lib/crawl/blocked-source-urls";
import {
  fetchCrossSourceDedupCandidates,
  fetchExistingJobRowsBySourceUrl,
  fetchJobRowsByFingerprints,
} from "@/lib/crawl/crawl-db-lookup";
import {
  isCrossSourceDuplicate,
  type CrossSourceDedupJob,
} from "@/lib/crawl/cross-source-dedup";
import { computeJobFingerprint, isDeadlineActiveForDedup } from "@/lib/crawl/fingerprint";
import type { JobInsert } from "@/lib/crawl/shared";
import type { Database } from "@/types/database.types";

type AdminClient = SupabaseClient<Database>;

const INSERT_CHUNK = 80;
const META_RPC_CHUNK = 40;

export type PersistCrawlBatchResult = {
  inserted: number;
  updated: number;
  skipped_blocked: number;
  skipped_fingerprint_dup: number;
  skipped_cross_source_dup: number;
  total_input: number;
};

function buildActiveFingerprintCollisionSet(
  rows: { fingerprint: string | null; deadline: string | null }[]
): Set<string> {
  const active = new Set<string>();
  for (const row of rows) {
    if (!row.fingerprint) continue;
    if (isDeadlineActiveForDedup(row.deadline)) {
      active.add(row.fingerprint);
    }
  }
  return active;
}

/**
 * 블록리스트 제외 → 지문 중복 스킵(DB + 동일 크롤 배치) → URL 기준 insert/update 분리 → 배치 반영.
 */
export async function persistCrawlBatch(
  supabase: AdminClient,
  jobs: readonly JobInsert[]
): Promise<PersistCrawlBatchResult> {
  const total_input = jobs.length;
  if (!total_input) {
    return {
      inserted: 0,
      updated: 0,
      skipped_blocked: 0,
      skipped_fingerprint_dup: 0,
      skipped_cross_source_dup: 0,
      total_input: 0,
    };
  }

  const afterBlock = await filterBlockedFromJobs(jobs);
  const skipped_blocked = jobs.length - afterBlock.length;

  const withFp = afterBlock.map((j) => ({
    ...j,
    fingerprint: computeJobFingerprint(j.company, j.title),
  }));

  const fpRows = await fetchJobRowsByFingerprints(
    supabase,
    withFp.map((j) => j.fingerprint)
  );
  const dbActiveFp = buildActiveFingerprintCollisionSet(fpRows);
  const localFp = new Set(dbActiveFp);

  const afterExactDedup: typeof withFp = [];
  let skipped_fingerprint_dup = 0;
  for (const row of withFp) {
    if (localFp.has(row.fingerprint)) {
      skipped_fingerprint_dup += 1;
      continue;
    }
    afterExactDedup.push(row);
    localFp.add(row.fingerprint);
  }

  const companies = [
    ...new Set(
      afterExactDedup.map((j) => j.company?.trim()).filter((c): c is string => Boolean(c))
    ),
  ];
  const crossSourceCandidates = await fetchCrossSourceDedupCandidates(supabase, companies);
  const localCrossSource: CrossSourceDedupJob[] = [];

  const afterDedup: typeof withFp = [];
  let skipped_cross_source_dup = 0;
  for (const row of afterExactDedup) {
    const job: CrossSourceDedupJob = {
      title: row.title,
      company: row.company,
      location: row.location,
      source_url: row.source_url,
    };
    const isDup =
      crossSourceCandidates.some((c) => isCrossSourceDuplicate(job, c)) ||
      localCrossSource.some((c) => isCrossSourceDuplicate(job, c));
    if (isDup) {
      skipped_cross_source_dup += 1;
      continue;
    }
    afterDedup.push(row);
    localCrossSource.push(job);
  }

  if (afterDedup.length === 0) {
    return {
      inserted: 0,
      updated: 0,
      skipped_blocked,
      skipped_fingerprint_dup,
      skipped_cross_source_dup,
      total_input,
    };
  }

  const urls = afterDedup.map((j) => j.source_url);
  const existingByUrl = await fetchExistingJobRowsBySourceUrl(supabase, urls);

  const nowIso = new Date().toISOString();
  const toInsert: Database["public"]["Tables"]["job_postings"]["Insert"][] = [];
  const toUpdateMeta: {
    id: string;
    title: string;
    company: string | null;
    location: string | null;
    deadline: string | null;
    fingerprint: string;
    last_seen_at: string;
  }[] = [];

  for (const row of afterDedup) {
    const existing = existingByUrl.get(row.source_url);
    if (existing) {
      toUpdateMeta.push({
        id: existing.id,
        title: row.title,
        company: row.company ?? null,
        location: row.location ?? null,
        deadline: row.deadline ?? null,
        fingerprint: row.fingerprint,
        last_seen_at: nowIso,
      });
    } else {
      toInsert.push({
        title: row.title,
        company: row.company ?? null,
        location: row.location ?? null,
        source: row.source,
        source_url: row.source_url,
        status: row.status,
        deadline: row.deadline ?? null,
        fingerprint: row.fingerprint,
        last_seen_at: nowIso,
      });
    }
  }

  let inserted = 0;
  const fallbackUpdates: (typeof toUpdateMeta)[number][] = [];

  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK);
    const { data, error } = await supabase.from("job_postings").insert(chunk).select("id");
    if (error) {
      if (error.code === "23505") {
        for (const single of chunk) {
          const { data: insData, error: oneErr } = await supabase
            .from("job_postings")
            .insert(single)
            .select("id");
          if (!oneErr && insData?.length) {
            inserted += insData.length;
            continue;
          }
          const { data: rowAgain } = await supabase
            .from("job_postings")
            .select("id")
            .eq("source_url", single.source_url)
            .maybeSingle();
          if (rowAgain?.id) {
            fallbackUpdates.push({
              id: rowAgain.id,
              title: single.title,
              company: single.company ?? null,
              location: single.location ?? null,
              deadline: single.deadline ?? null,
              fingerprint: single.fingerprint ?? computeJobFingerprint(single.company, single.title),
              last_seen_at: nowIso,
            });
          }
        }
        continue;
      }
      throw new Error(error.message);
    }
    inserted += data?.length ?? 0;
  }

  const allUpdates = toUpdateMeta.concat(fallbackUpdates);
  let updated = 0;
  for (let i = 0; i < allUpdates.length; i += META_RPC_CHUNK) {
    const chunk = allUpdates.slice(i, i + META_RPC_CHUNK);
    const { error } = await supabase.rpc("batch_update_job_posting_crawl_meta", {
      p_rows: chunk,
    });
    if (error) throw new Error(error.message);
    updated += chunk.length;
  }

  return {
    inserted,
    updated,
    skipped_blocked,
    skipped_fingerprint_dup,
    skipped_cross_source_dup,
    total_input,
  };
}
