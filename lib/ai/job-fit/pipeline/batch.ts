/**
 * HITL 대기열: DB `status = 'pending'`인 공고만 일괄 LLM 판별(승인·거절·계속 보류).
 *
 * Benchmark threshold(`JOB_FIT_BENCHMARK_THRESHOLDS`)와의 연동 정책은 **옵션 A**:
 * 이 모듈은 호출하지 않는다. 골든 런·메트릭 산출 후 `POST /api/admin/benchmark-job-fit` 또는
 * `npm run check:job-fit-benchmark`로 검증한다. 상세는 docs/job-fit-benchmark.md.
 */
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
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
  let approved = 0;
  let rejected = 0;
  let pending = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const decision = await evaluateJobFit({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        source: job.source,
        sourceUrl: job.source_url,
      });

      if (decision.finalStatus !== "pending") {
        const nowIso = new Date().toISOString();
        const row =
          decision.finalStatus === "approved"
            ? { status: "approved" as const, rejected_at: null }
            : { status: "rejected" as const, published_at: null, rejected_at: nowIso };
        const { error: updateError } = await supabase.from("job_postings").update(row).eq("id", job.id);
        if (updateError) throw new Error(updateError.message);
      }

      if (decision.finalStatus === "approved") approved += 1;
      else if (decision.finalStatus === "rejected") rejected += 1;
      else pending += 1;

      console.info("[job-fit] decision", {
        id: job.id,
        title: job.title,
        finalStatus: decision.finalStatus,
        score: decision.score,
        model: decision.model,
        promptVersion: decision.promptVersion,
        reasons: decision.reasons,
      });
    } catch (evaluationError) {
      failed += 1;
      console.error("[job-fit] evaluation failed", {
        id: job.id,
        error:
          evaluationError instanceof Error
            ? evaluationError.message
            : String(evaluationError),
      });
    }
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
