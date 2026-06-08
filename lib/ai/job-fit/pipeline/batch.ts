/**
 * HITL 대기열: DB `status = 'pending'`인 공고만 일괄 LLM 판별(승인·거절·계속 보류).
 *
 * Benchmark threshold(`JOB_FIT_BENCHMARK_THRESHOLDS`)와의 연동 정책은 **옵션 A**:
 * 이 모듈은 호출하지 않는다. 골든 런·메트릭 산출 후 `POST /api/admin/benchmark-job-fit` 또는
 * `npm run check:job-fit-benchmark`로 검증한다. 상세는 docs/job-fit-benchmark.md.
 *
 * LLM 동시 처리 상한: `JOB_FIT_BATCH_CONCURRENCY`(미설정 시 기본 1, 최대 30).
 * 규칙 판별 결과의 DB 반영은 `JOB_FIT_DB_UPDATE_CONCURRENCY`(미설정 시 기본 8)로 별도 제어한다.
 */
import { poolAllSettled } from "@/lib/async/pool-all-settled";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { buildAiFitSnapshotPayload } from "../domain/ai-fit-snapshot";
import type { JobFitDecision, JobFitInput } from "../domain/schema";
import { evaluateDeterministicJobFit, evaluateLlmJobFit } from "./evaluate";
import { JobFitProviderHttpError } from "./providers";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];
type JobPostingUpdate = Database["public"]["Tables"]["job_postings"]["Update"];

export type RunJobFitBatchResult = {
  success: boolean;
  scanned: number;
  approved: number;
  rejected: number;
  pending: number;
  failed: number;
  skipped: number;
  error?: string;
};

// `JOB_FIT_BATCH_CONCURRENCY`: LLM 판별 대상 공고를 동시에 처리할 비동기 worker 수.
// CPU worker/thread 수가 아니라 poolAllSettled가 동시에 진행하는 evaluateLlmJobFit 작업 수다.
const DEFAULT_JOB_FIT_BATCH_CONCURRENCY = 1;
const MAX_JOB_FIT_BATCH_CONCURRENCY = 30;

// `JOB_FIT_DB_UPDATE_CONCURRENCY`: 판별 결과를 Supabase에 반영하는 update 요청 동시 처리 수.
const DEFAULT_JOB_FIT_DB_UPDATE_CONCURRENCY = 8;
const MAX_JOB_FIT_DB_UPDATE_CONCURRENCY = 30;

const resolveEnvInt = (name: string, fallback: number, max: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
};

const resolveJobFitBatchConcurrency = (): number =>
  resolveEnvInt(
    "JOB_FIT_BATCH_CONCURRENCY",
    DEFAULT_JOB_FIT_BATCH_CONCURRENCY,
    MAX_JOB_FIT_BATCH_CONCURRENCY
  );

const resolveJobFitDbUpdateConcurrency = (): number =>
  resolveEnvInt(
    "JOB_FIT_DB_UPDATE_CONCURRENCY",
    DEFAULT_JOB_FIT_DB_UPDATE_CONCURRENCY,
    MAX_JOB_FIT_DB_UPDATE_CONCURRENCY
  );

type JobOutcome = "approved" | "rejected" | "pending" | "failed" | "skipped";
type JobWithInput = {
  job: JobPosting;
  input: JobFitInput;
};
type DeterministicWork = JobWithInput & {
  decision: JobFitDecision;
};
type BatchCounters = Record<JobOutcome, number>;

const toJobFitInput = (job: JobPosting): JobFitInput => ({
  id: job.id,
  title: job.title,
  company: job.company,
  location: job.location,
  source: job.source,
  sourceUrl: job.source_url,
});

const countOutcomes = (settled: PromiseSettledResult<JobOutcome>[]): BatchCounters => {
  const counters: BatchCounters = {
    approved: 0,
    rejected: 0,
    pending: 0,
    failed: 0,
    skipped: 0,
  };

  for (const r of settled) {
    if (r.status === "rejected") {
      counters.failed += 1;
      continue;
    }
    counters[r.value] += 1;
  }

  return counters;
};

export const runJobFitBatch = async (limit = 30): Promise<RunJobFitBatchResult> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("job_postings")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
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
      skipped: 0,
      error: error.message,
    };
  }

  const jobs = data ?? [];
  const llmConcurrency = resolveJobFitBatchConcurrency();
  const dbUpdateConcurrency = resolveJobFitDbUpdateConcurrency();
  let providerRateLimitReached = false;
  let providerRateLimitError: string | undefined;

  const updatePendingJob = async (
    job: JobPosting,
    row: JobPostingUpdate
  ): Promise<JobOutcome | null> => {
    const { data: updatedRows, error: updateError } = await supabase
      .from("job_postings")
      .update(row)
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .returns<{ id: string }[]>();

    if (updateError) {
      console.error("[job-fit] evaluation failed", {
        id: job.id,
        error: updateError.message,
      });
      return "failed";
    }

    if ((updatedRows ?? []).length === 0) return "skipped";
    return null;
  };

  const applyDecision = async (
    job: JobPosting,
    decision: JobFitDecision
  ): Promise<JobOutcome> => {
    const snapshot = buildAiFitSnapshotPayload(decision);

    if (decision.finalStatus === "pending") {
      const updateOutcome = await updatePendingJob(job, { ai_fit_snapshot: snapshot });
      if (updateOutcome) return updateOutcome;
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
      const updateOutcome = await updatePendingJob(job, row);
      if (updateOutcome) return updateOutcome;
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
  };

  const deterministicWork: DeterministicWork[] = [];
  const llmWork: JobWithInput[] = [];
  const preflightSettled: PromiseSettledResult<JobOutcome>[] = [];

  for (const job of jobs) {
    const input = toJobFitInput(job);
    try {
      const decision = evaluateDeterministicJobFit(input);
      if (decision) {
        deterministicWork.push({ job, input, decision });
      } else {
        llmWork.push({ job, input });
      }
    } catch (evaluationError) {
      console.error("[job-fit] evaluation failed", {
        id: job.id,
        error:
          evaluationError instanceof Error
            ? evaluationError.message
            : String(evaluationError),
      });
      preflightSettled.push({ status: "fulfilled", value: "failed" });
    }
  }

  const deterministicSettled = await poolAllSettled(
    deterministicWork,
    dbUpdateConcurrency,
    ({ job, decision }) => applyDecision(job, decision)
  );

  const processLlmOne = async ({ job, input }: JobWithInput): Promise<JobOutcome> => {
    if (providerRateLimitReached) {
      return "skipped";
    }

    try {
      const decision = await evaluateLlmJobFit(input);
      return await applyDecision(job, decision);
    } catch (evaluationError) {
      if (evaluationError instanceof JobFitProviderHttpError && evaluationError.status === 429) {
        providerRateLimitReached = true;
        providerRateLimitError = evaluationError.message;
      }
      const providerError =
        evaluationError instanceof JobFitProviderHttpError
          ? {
              provider: evaluationError.provider,
              providerStatus: evaluationError.status,
              providerDetail: evaluationError.detail,
              retryAfterMs: evaluationError.retryAfterMs,
            }
          : {};

      console.error("[job-fit] evaluation failed", {
        id: job.id,
        error:
          evaluationError instanceof Error
            ? evaluationError.message
            : String(evaluationError),
        ...providerError,
      });
      return "failed";
    }
  };

  const llmSettled = await poolAllSettled(llmWork, llmConcurrency, processLlmOne);
  const counters = countOutcomes([
    ...preflightSettled,
    ...deterministicSettled,
    ...llmSettled,
  ]);

  return {
    success: counters.failed === 0,
    scanned: jobs.length,
    approved: counters.approved,
    rejected: counters.rejected,
    pending: counters.pending,
    failed: counters.failed,
    skipped: counters.skipped,
    error: providerRateLimitError,
  };
};
