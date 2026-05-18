/**
 * HITL 대기열: DB `status = 'pending'`인 공고만 일괄 LLM 판별(승인·거절·계속 보류).
 *
 * Benchmark threshold(`JOB_FIT_BENCHMARK_THRESHOLDS`)와의 연동 정책은 **옵션 A**:
 * 이 모듈은 호출하지 않는다. 골든 런·메트릭 산출 후 `POST /api/admin/benchmark-job-fit` 또는
 * `npm run check:job-fit-benchmark`로 검증한다. 상세는 docs/job-fit-benchmark.md.
 *
 * 동시 처리 상한: `JOB_FIT_BATCH_CONCURRENCY`(미설정 시 기본 4, 최대 30). RPM/429 완화용.
 */
import { poolAllSettled } from "@/lib/async/pool-all-settled";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { buildAiFitSnapshotPayload } from "../domain/ai-fit-snapshot";
import { evaluateJobFit } from "./evaluate";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

export type RunJobFitBatchResult = {
  success: boolean;
  scanned: number;
  approved: number;
  rejected: number;
  pending: number;
  failed: number;
  error?: string;
};

const DEFAULT_JOB_FIT_BATCH_CONCURRENCY = 4;
const MAX_JOB_FIT_BATCH_CONCURRENCY = 30;

const resolveJobFitBatchConcurrency = (): number => {
  const raw = process.env.JOB_FIT_BATCH_CONCURRENCY;
  if (raw === undefined || raw.trim() === "") return DEFAULT_JOB_FIT_BATCH_CONCURRENCY;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_JOB_FIT_BATCH_CONCURRENCY;
  return Math.min(n, MAX_JOB_FIT_BATCH_CONCURRENCY);
};

type JobOutcome = "approved" | "rejected" | "pending" | "failed";

export const runJobFitBatch = async (limit = 30): Promise<RunJobFitBatchResult> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("job_postings")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<JobPosting[]>();

  if (error) {
    return {
      success: false,
      scanned: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      failed: 0,
      error: error.message,
    };
  }

  const jobs = data ?? [];
  const concurrency = resolveJobFitBatchConcurrency();

  const processOne = async (job: JobPosting): Promise<JobOutcome> => {
    try {
      const decision = await evaluateJobFit({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        source: job.source,
        sourceUrl: job.source_url,
      });

      const snapshot = buildAiFitSnapshotPayload(decision);

      if (decision.finalStatus === "pending") {
        const { error: updateError } = await supabase
          .from("job_postings")
          .update({ ai_fit_snapshot: snapshot })
          .eq("id", job.id);
        if (updateError) {
          console.error("[job-fit] evaluation failed", {
            id: job.id,
            error: updateError.message,
          });
          return "failed";
        }
      } else {
        const nowIso = new Date().toISOString();
        const row =
          decision.finalStatus === "approved"
            ? {
                status: "approved" as const,
                rejected_at: null,
                ai_fit_snapshot: snapshot,
              }
            : {
                status: "rejected" as const,
                published_at: null,
                rejected_at: nowIso,
                ai_fit_snapshot: snapshot,
              };
        const { error: updateError } = await supabase.from("job_postings").update(row).eq("id", job.id);
        if (updateError) {
          console.error("[job-fit] evaluation failed", {
            id: job.id,
            error: updateError.message,
          });
          return "failed";
        }
      }

      console.info("[job-fit] decision", {
        id: job.id,
        title: job.title,
        finalStatus: decision.finalStatus,
        score: decision.score,
        model: decision.model,
        promptVersion: decision.promptVersion,
        reasons: decision.reasons,
      });

      return decision.finalStatus;
    } catch (evaluationError) {
      console.error("[job-fit] evaluation failed", {
        id: job.id,
        error:
          evaluationError instanceof Error
            ? evaluationError.message
            : String(evaluationError),
      });
      return "failed";
    }
  };

  const settled = await poolAllSettled(jobs, concurrency, processOne);

  let approved = 0;
  let rejected = 0;
  let pending = 0;
  let failed = 0;

  for (const r of settled) {
    if (r.status === "rejected") {
      failed += 1;
      continue;
    }
    const outcome = r.value;
    if (outcome === "approved") approved += 1;
    else if (outcome === "rejected") rejected += 1;
    else if (outcome === "pending") pending += 1;
    else failed += 1;
  }

  return {
    success: failed === 0,
    scanned: jobs.length,
    approved,
    rejected,
    pending,
    failed,
  };
};
