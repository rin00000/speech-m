/**
 * `status = rejected`이고 `rejected_at`이 보존 기간보다 오래된 행을 삭제한다.
 * 크롤 `ignoreDuplicates` 해제를 위해 오래된 거절 행을 비우는 용도.
 */
import { createAdminClient } from "@/lib/supabase/server";

export type PurgeRejectedPastRetentionResult = {
  success: boolean;
  retentionDays: number;
  cutoffIso: string;
  scanned: number;
  deleted: number;
  error?: string;
};

const DELETE_CHUNK = 200;

export async function purgeRejectedPastRetention(): Promise<PurgeRejectedPastRetentionResult> {
  const retentionDays = getEnvInt("REJECTED_JOB_RETENTION_DAYS", 90);
  const cutoffMs = Date.now() - retentionDays * 86_400_000;
  const cutoffIso = new Date(cutoffMs).toISOString();

  const supabase = createAdminClient();

  const [oldByRejectedAt, oldByCreatedAt] = await Promise.all([
    supabase
      .from("job_postings")
      .select("id")
      .eq("status", "rejected")
      .not("rejected_at", "is", null)
      .lt("rejected_at", cutoffIso)
      .returns<{ id: string }[]>(),
    supabase
      .from("job_postings")
      .select("id")
      .eq("status", "rejected")
      .is("rejected_at", null)
      .lt("created_at", cutoffIso)
      .returns<{ id: string }[]>(),
  ]);

  const err = oldByRejectedAt.error ?? oldByCreatedAt.error;
  if (err) {
    return {
      success: false,
      retentionDays,
      cutoffIso,
      scanned: 0,
      deleted: 0,
      error: err.message,
    };
  }

  const ids = [
    ...new Set([
      ...(oldByRejectedAt.data ?? []).map((r) => r.id),
      ...(oldByCreatedAt.data ?? []).map((r) => r.id),
    ]),
  ];

  let deleted = 0;
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const chunk = ids.slice(i, i + DELETE_CHUNK);
    const { error: delErr } = await supabase.from("job_postings").delete().in("id", chunk);
    if (delErr) {
      return {
        success: false,
        retentionDays,
        cutoffIso,
        scanned: ids.length,
        deleted,
        error: delErr.message,
      };
    }
    deleted += chunk.length;
  }

  return { success: true, retentionDays, cutoffIso, scanned: ids.length, deleted };
}

function getEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}
