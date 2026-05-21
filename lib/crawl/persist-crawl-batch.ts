import type { SupabaseClient } from "@supabase/supabase-js";
import { filterBlockedFromJobs } from "@/lib/crawl/blocked-source-urls";
import {
  fetchCrossSourceDedupCandidates,
  fetchExistingJobRowsBySourceUrl,
  fetchJobRowsByFingerprints,
  type ExistingJobPostingRow,
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

type MetaUpdateRow = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  deadline: string | null;
  fingerprint: string;
  last_seen_at: string;
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
 * 같은 배치에 중복된 source_url이 들어오면 마지막 항목만 남긴다(메타 갱신 일관성).
 */
function dedupeBySourceUrl(jobs: readonly JobInsert[]): JobInsert[] {
  const map = new Map<string, JobInsert>();
  for (const j of jobs) {
    const url = j.source_url.trim();
    if (!url) continue;
    map.set(url, j);
  }
  return [...map.values()];
}

/**
 * source_url이 DB에 이미 있는 잡(메타 갱신 대상)과 신규 후보를 분리.
 * 기존 행은 추가 dedup 없이 항상 메타 갱신한다(원본이 마감일만 바뀐 경우도 반영).
 */
export function splitJobsByExistingSourceUrl(
  jobs: readonly JobInsert[],
  existingByUrl: Map<string, ExistingJobPostingRow>
): {
  existing: { incoming: JobInsert; existing: ExistingJobPostingRow }[];
  fresh: JobInsert[];
} {
  const existing: { incoming: JobInsert; existing: ExistingJobPostingRow }[] = [];
  const fresh: JobInsert[] = [];
  for (const j of jobs) {
    const e = existingByUrl.get(j.source_url);
    if (e) {
      existing.push({ incoming: j, existing: e });
    } else {
      fresh.push(j);
    }
  }
  return { existing, fresh };
}

function buildMetaUpdateRow(
  incoming: JobInsert,
  existingId: string,
  nowIso: string
): MetaUpdateRow {
  return {
    id: existingId,
    title: incoming.title,
    company: incoming.company ?? null,
    location: incoming.location ?? null,
    deadline: incoming.deadline ?? null,
    fingerprint: computeJobFingerprint(incoming.company, incoming.title),
    last_seen_at: nowIso,
  };
}

/**
 * 1) blocked URL 제외
 * 2) source_url 기준으로 기존/신규 분리 — 기존은 무조건 메타 갱신(마감일 등 원본 수정 반영)
 * 3) 신규에 대해서만 fingerprint·cross-source dedup
 * 4) 신규 insert + 기존(+race fallback) 메타 갱신 일괄 반영
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

  const uniqueByUrl = dedupeBySourceUrl(afterBlock);
  if (uniqueByUrl.length === 0) {
    return {
      inserted: 0,
      updated: 0,
      skipped_blocked,
      skipped_fingerprint_dup: 0,
      skipped_cross_source_dup: 0,
      total_input,
    };
  }

  const urls = uniqueByUrl.map((j) => j.source_url);
  const existingByUrl = await fetchExistingJobRowsBySourceUrl(supabase, urls);
  const { existing: existingMatched, fresh: freshCandidates } = splitJobsByExistingSourceUrl(
    uniqueByUrl,
    existingByUrl
  );

  const withFp = freshCandidates.map((j) => ({
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

  const nowIso = new Date().toISOString();

  const toUpdateMeta: MetaUpdateRow[] = existingMatched.map(({ incoming, existing }) =>
    buildMetaUpdateRow(incoming, existing.id, nowIso)
  );

  const toInsert: Database["public"]["Tables"]["job_postings"]["Insert"][] = afterDedup.map(
    (row) => ({
      title: row.title,
      company: row.company ?? null,
      location: row.location ?? null,
      source: row.source,
      source_url: row.source_url,
      status: row.status,
      deadline: row.deadline ?? null,
      fingerprint: row.fingerprint,
      last_seen_at: nowIso,
    })
  );

  let inserted = 0;
  const fallbackUpdates: MetaUpdateRow[] = [];

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
              fingerprint:
                single.fingerprint ?? computeJobFingerprint(single.company, single.title),
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
