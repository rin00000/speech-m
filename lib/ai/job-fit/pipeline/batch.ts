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
import { ADMIN_JOB_FIT_BATCH_LIMIT, JOB_FIT_ADMIN_RUN_LOCK_TTL_MS } from "../constants";
import { buildAiFitSnapshotPayload } from "../domain/ai-fit-snapshot";
import type { JobFitDecision, JobFitInput } from "../domain/schema";
import { evaluateDeterministicJobFit, evaluateLlmJobFit } from "./evaluate";
import {
  JobFitProviderHttpError,
  resolveJobFitGeminiRateLimitSettings,
  type JobFitProviderRequestMetrics,
} from "./providers";

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
const MAX_EXPERIMENT_ADMIN_JOB_FIT_BATCH_LIMIT = 40;
const BYTES_PER_MB = 1024 * 1024;

export type RunJobFitBatchOptions = {
  experimentAllowed?: boolean;
  lockAcquiredAtMs?: number;
};

type JobFitBatchRunConfig = {
  experimentEnabled: boolean;
  batchRunId: string;
  experimentName: string | null;
  experimentPhase: string | null;
  experimentCase: string | null;
  repetition: number | null;
  batchLimit: number;
  llmConcurrency: number;
  dbUpdateConcurrency: number;
  geminiRpmLimit: number;
  geminiMinIntervalMs: number;
  lockTtlMs: number;
  warnings: string[];
};

type InputTextLengthStats = {
  inputTextLengthMin: number;
  inputTextLengthMax: number;
  inputTextLengthAvg: number;
  inputTextLengthMedian: number;
};

type LlmItemResult = "success" | "failed" | "skipped";

type LlmItemMetric = {
  itemIndex: number;
  queueWaitMs: number;
  providerDurationMs: number;
  totalItemDurationMs: number;
  providerStatus: number | null;
  retryAfterMs: number | null;
  result: LlmItemResult;
};

const pushConfigWarning = (warnings: string[] | undefined, message: string): void => {
  warnings?.push(message);
};

const resolveEnvInt = (
  name: string,
  fallback: number,
  max: number,
  warnings?: string[]
): number => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || (warnings && `${n}` !== raw.trim())) {
    pushConfigWarning(warnings, `${name} must be a positive integer. Using ${fallback}.`);
    return fallback;
  }
  if (n > max) {
    pushConfigWarning(warnings, `${name} exceeds the max (${max}). Using ${max}.`);
    return max;
  }
  return n;
};

const resolveJobFitBatchConcurrency = (warnings?: string[]): number =>
  resolveEnvInt(
    "JOB_FIT_BATCH_CONCURRENCY",
    DEFAULT_JOB_FIT_BATCH_CONCURRENCY,
    MAX_JOB_FIT_BATCH_CONCURRENCY,
    warnings
  );

const resolveJobFitDbUpdateConcurrency = (warnings?: string[]): number =>
  resolveEnvInt(
    "JOB_FIT_DB_UPDATE_CONCURRENCY",
    DEFAULT_JOB_FIT_DB_UPDATE_CONCURRENCY,
    MAX_JOB_FIT_DB_UPDATE_CONCURRENCY,
    warnings
  );

const parseOptionalPositiveInt = (name: string, warnings: string[]): number | null => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || `${n}` !== raw.trim()) {
    warnings.push(`${name} must be a positive integer. Leaving it unset.`);
    return null;
  }
  return n;
};

const isExperimentEnabled = (): boolean =>
  process.env.JOB_FIT_EXPERIMENT_ENABLED?.trim().toLowerCase() === "true";

const createBatchRunId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const clampConcurrencyToBatchLimit = (
  name: string,
  value: number,
  batchLimit: number,
  warnings: string[]
): number => {
  if (value <= batchLimit) return value;
  warnings.push(`${name} (${value}) exceeds batchLimit (${batchLimit}). Using ${batchLimit}.`);
  return batchLimit;
};

const buildJobFitBatchRunConfig = (
  requestedLimit: number,
  experimentAllowed: boolean
): JobFitBatchRunConfig => {
  const experimentEnabled = experimentAllowed && isExperimentEnabled();
  const warnings: string[] = [];
  const batchLimit = experimentEnabled
    ? resolveEnvInt(
        "ADMIN_JOB_FIT_BATCH_LIMIT",
        requestedLimit,
        MAX_EXPERIMENT_ADMIN_JOB_FIT_BATCH_LIMIT,
        warnings
      )
    : requestedLimit;
  const llmConcurrency = experimentEnabled
    ? clampConcurrencyToBatchLimit(
        "JOB_FIT_BATCH_CONCURRENCY",
        resolveJobFitBatchConcurrency(warnings),
        batchLimit,
        warnings
      )
    : resolveJobFitBatchConcurrency();
  const dbUpdateConcurrency = experimentEnabled
    ? clampConcurrencyToBatchLimit(
        "JOB_FIT_DB_UPDATE_CONCURRENCY",
        resolveJobFitDbUpdateConcurrency(warnings),
        batchLimit,
        warnings
      )
    : resolveJobFitDbUpdateConcurrency();
  const geminiRateLimit = resolveJobFitGeminiRateLimitSettings(
    experimentEnabled ? warnings : undefined,
    experimentEnabled
  );
  const estimatedProviderStartSpanMs =
    Math.max(0, batchLimit - 1) * geminiRateLimit.minIntervalMs;

  if (
    experimentEnabled &&
    estimatedProviderStartSpanMs > JOB_FIT_ADMIN_RUN_LOCK_TTL_MS * 0.7
  ) {
    warnings.push(
      `Estimated Gemini start span (${estimatedProviderStartSpanMs}ms) exceeds 70% of lock TTL (${JOB_FIT_ADMIN_RUN_LOCK_TTL_MS}ms).`
    );
  }

  return {
    experimentEnabled,
    batchRunId: createBatchRunId(),
    experimentName: process.env.JOB_FIT_EXPERIMENT_NAME?.trim() || null,
    experimentPhase: process.env.JOB_FIT_EXPERIMENT_PHASE?.trim() || null,
    experimentCase: process.env.JOB_FIT_EXPERIMENT_CASE?.trim() || null,
    repetition: parseOptionalPositiveInt("JOB_FIT_EXPERIMENT_REPETITION", warnings),
    batchLimit,
    llmConcurrency,
    dbUpdateConcurrency,
    geminiRpmLimit: geminiRateLimit.rpmLimit,
    geminiMinIntervalMs: geminiRateLimit.minIntervalMs,
    lockTtlMs: JOB_FIT_ADMIN_RUN_LOCK_TTL_MS,
    warnings,
  };
};

const mb = (bytes: number): number => Math.round((bytes / BYTES_PER_MB) * 100) / 100;

const roundMs = (value: number): number => Math.round(value);

const percentile = (values: readonly number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
};

const average = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const inputTextForStats = (input: JobFitInput): string =>
  [input.title, input.company ?? "", input.location ?? "", input.source, input.sourceUrl].join(
    "\n"
  );

const inputTextLengthStats = (lengths: readonly number[]): InputTextLengthStats => ({
  inputTextLengthMin: lengths.length === 0 ? 0 : Math.min(...lengths),
  inputTextLengthMax: lengths.length === 0 ? 0 : Math.max(...lengths),
  inputTextLengthAvg: Math.round(average(lengths)),
  inputTextLengthMedian: roundMs(percentile(lengths, 50)),
});

const maskJobId = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return `job_${hash.toString(16).padStart(8, "0")}`;
};

const logJson = (payload: Record<string, unknown>, level: "info" | "warn" = "info"): void => {
  console[level](JSON.stringify(payload));
};

type JobOutcome = "approved" | "rejected" | "pending" | "failed" | "skipped";
type JobWithInput = {
  job: JobPosting;
  input: JobFitInput;
  itemIndex: number;
  maskedJobId: string;
  inputTextLength: number;
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

export const runJobFitBatch = async (
  limit = ADMIN_JOB_FIT_BATCH_LIMIT,
  options: RunJobFitBatchOptions = {}
): Promise<RunJobFitBatchResult> => {
  const config = buildJobFitBatchRunConfig(limit, options.experimentAllowed === true);
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const perfStart = performance.now();
  const memoryStart = process.memoryUsage();
  const cpuStart = process.cpuUsage();
  const providerRequestMetrics: JobFitProviderRequestMetrics[] = [];
  const llmItemMetrics: LlmItemMetric[] = [];

  const baseExperimentLog = {
    batchRunId: config.batchRunId,
    experimentName: config.experimentName,
    experimentPhase: config.experimentPhase,
    experimentCase: config.experimentCase,
    repetition: config.repetition,
    batchLimit: config.batchLimit,
    llmConcurrency: config.llmConcurrency,
    dbUpdateConcurrency: config.dbUpdateConcurrency,
    geminiRpmLimit: config.geminiRpmLimit,
    geminiMinIntervalMs: config.geminiMinIntervalMs,
    lockTtlMs: config.lockTtlMs,
  };

  const finishExperimentLog = (payload: {
    jobs: JobWithInput[];
    deterministicWorkCount: number;
    llmWorkCount: number;
    llmSuccessCount: number;
    counters: BatchCounters;
    success: boolean;
  }): void => {
    if (!config.experimentEnabled) return;

    const memoryEnd = process.memoryUsage();
    const cpuEnd = process.cpuUsage(cpuStart);
    const durationMs = roundMs(performance.now() - perfStart);
    const lockHeldMs = Date.now() - (options.lockAcquiredAtMs ?? startedAtMs);
    const queueWaitValues = llmItemMetrics.map((metric) => metric.queueWaitMs);
    const providerDurationValues = llmItemMetrics.map(
      (metric) => metric.providerDurationMs
    );
    const provider429Count = providerRequestMetrics.filter(
      (metric) => metric.status === 429
    ).length;
    const providerErrorCount = providerRequestMetrics.filter(
      (metric) => metric.status === null || metric.status >= 400
    ).length;
    const retryAfterValues = providerRequestMetrics
      .map((metric) => metric.retryAfterMs)
      .filter((value): value is number => typeof value === "number");
    const inputStats = inputTextLengthStats(
      payload.jobs.map((job) => job.inputTextLength)
    );

    logJson({
      event: "job_fit_batch_completed",
      ...baseExperimentLog,
      selectedCount: payload.jobs.length,
      pendingCount: payload.counters.pending,
      ruleProcessedCount: payload.deterministicWorkCount,
      llmWorkCount: payload.llmWorkCount,
      llmSuccessCount: payload.llmSuccessCount,
      completedCount:
        payload.counters.approved + payload.counters.rejected + payload.counters.pending,
      skippedCount: payload.counters.skipped,
      failedCount: payload.counters.failed,
      approvedCount: payload.counters.approved,
      rejectedCount: payload.counters.rejected,
      providerRequestCount: providerRequestMetrics.length,
      provider429Count,
      providerErrorCount,
      maxRetryAfterMs: retryAfterValues.length ? Math.max(...retryAfterValues) : 0,
      queueWaitAvgMs: roundMs(average(queueWaitValues)),
      queueWaitP95Ms: roundMs(percentile(queueWaitValues, 95)),
      providerDurationAvgMs: roundMs(average(providerDurationValues)),
      providerDurationP95Ms: roundMs(percentile(providerDurationValues, 95)),
      durationMs,
      lockHeldMs,
      memoryRssStartMb: mb(memoryStart.rss),
      memoryRssEndMb: mb(memoryEnd.rss),
      memoryRssDeltaMb: mb(memoryEnd.rss - memoryStart.rss),
      heapUsedStartMb: mb(memoryStart.heapUsed),
      heapUsedEndMb: mb(memoryEnd.heapUsed),
      heapUsedDeltaMb: mb(memoryEnd.heapUsed - memoryStart.heapUsed),
      cpuUserMs: roundMs(cpuEnd.user / 1000),
      cpuSystemMs: roundMs(cpuEnd.system / 1000),
      ...inputStats,
      success: payload.success,
      configWarnings: config.warnings,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
  };

  if (config.experimentEnabled) {
    logJson({
      event: "job_fit_batch_started",
      ...baseExperimentLog,
      startedAt,
    });
    if (config.warnings.length > 0) {
      logJson(
        {
          event: "job_fit_experiment_config_warning",
          batchRunId: config.batchRunId,
          warnings: config.warnings,
        },
        "warn"
      );
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("job_postings")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(config.batchLimit)
    .returns<JobPosting[]>();

  if (error) {
    const counters: BatchCounters = {
      approved: 0,
      rejected: 0,
      pending: 0,
      failed: 0,
      skipped: 0,
    };
    finishExperimentLog({
      jobs: [],
      deterministicWorkCount: 0,
      llmWorkCount: 0,
      llmSuccessCount: 0,
      counters,
      success: false,
    });
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

  const jobs = (data ?? []).map((job, itemIndex) => {
    const input = toJobFitInput(job);
    return {
      job,
      input,
      itemIndex,
      maskedJobId: maskJobId(job.id),
      inputTextLength: inputTextForStats(input).length,
    };
  });
  const llmConcurrency = config.llmConcurrency;
  const dbUpdateConcurrency = config.dbUpdateConcurrency;
  let providerRateLimitReached = false;
  let providerRateLimitError: string | undefined;

  const updatePendingJob = async (
    work: JobWithInput,
    row: JobPostingUpdate
  ): Promise<JobOutcome | null> => {
    const { data: updatedRows, error: updateError } = await supabase
      .from("job_postings")
      .update(row)
      .eq("id", work.job.id)
      .eq("status", "pending")
      .select("id")
      .returns<{ id: string }[]>();

    if (updateError) {
      console.error("[job-fit] evaluation failed", {
        ...(config.experimentEnabled
          ? { batchRunId: config.batchRunId, itemIndex: work.itemIndex, maskedJobId: work.maskedJobId }
          : { id: work.job.id }),
        error: updateError.message,
      });
      return "failed";
    }

    if ((updatedRows ?? []).length === 0) return "skipped";
    return null;
  };

  const applyDecision = async (
    work: JobWithInput,
    decision: JobFitDecision
  ): Promise<JobOutcome> => {
    const snapshot = buildAiFitSnapshotPayload(decision);

    if (decision.finalStatus === "pending") {
      const updateOutcome = await updatePendingJob(work, { ai_fit_snapshot: snapshot });
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
      const updateOutcome = await updatePendingJob(work, row);
      if (updateOutcome) return updateOutcome;
    }

    if (config.experimentEnabled) {
      console.info("[job-fit] decision", {
        batchRunId: config.batchRunId,
        itemIndex: work.itemIndex,
        maskedJobId: work.maskedJobId,
        finalStatus: decision.finalStatus,
        score: decision.score,
        model: decision.model,
        promptVersion: decision.promptVersion,
      });
    } else {
      console.info("[job-fit] decision", {
        id: work.job.id,
        title: work.job.title,
        finalStatus: decision.finalStatus,
        score: decision.score,
        model: decision.model,
        promptVersion: decision.promptVersion,
        reasons: decision.reasons,
      });
    }

    return decision.finalStatus;
  };

  const deterministicWork: DeterministicWork[] = [];
  const llmWork: JobWithInput[] = [];
  const preflightSettled: PromiseSettledResult<JobOutcome>[] = [];

  for (const work of jobs) {
    try {
      const decision = evaluateDeterministicJobFit(work.input);
      if (decision) {
        deterministicWork.push({ ...work, decision });
      } else {
        llmWork.push(work);
      }
    } catch (evaluationError) {
      console.error("[job-fit] evaluation failed", {
        ...(config.experimentEnabled
          ? { batchRunId: config.batchRunId, itemIndex: work.itemIndex, maskedJobId: work.maskedJobId }
          : { id: work.job.id }),
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
    (work) => applyDecision(work, work.decision)
  );

  const recordLlmItemMetric = (metric: LlmItemMetric): void => {
    if (!config.experimentEnabled) return;
    llmItemMetrics.push(metric);
    logJson({
      event: "job_fit_llm_item_completed",
      batchRunId: config.batchRunId,
      itemIndex: metric.itemIndex,
      queueWaitMs: metric.queueWaitMs,
      providerDurationMs: metric.providerDurationMs,
      totalItemDurationMs: metric.totalItemDurationMs,
      providerStatus: metric.providerStatus,
      retryAfterMs: metric.retryAfterMs,
      result: metric.result,
    });
  };

  const processLlmOne = async (work: JobWithInput): Promise<JobOutcome> => {
    const itemStartedAt = performance.now();
    const itemProviderMetrics: JobFitProviderRequestMetrics[] = [];
    const finishLlmItem = (result: LlmItemResult): void => {
      const lastProviderMetric = itemProviderMetrics.at(-1);
      recordLlmItemMetric({
        itemIndex: work.itemIndex,
        queueWaitMs: itemProviderMetrics.reduce(
          (sum, metric) => sum + metric.queueWaitMs,
          0
        ),
        providerDurationMs: itemProviderMetrics.reduce(
          (sum, metric) => sum + metric.providerDurationMs,
          0
        ),
        totalItemDurationMs: roundMs(performance.now() - itemStartedAt),
        providerStatus: lastProviderMetric?.status ?? null,
        retryAfterMs: lastProviderMetric?.retryAfterMs ?? null,
        result,
      });
    };

    if (providerRateLimitReached) {
      finishLlmItem("skipped");
      return "skipped";
    }

    try {
      const decision = await evaluateLlmJobFit(
        work.input,
        config.experimentEnabled
          ? {
              strictRateLimit: true,
              onProviderRequest: (metric) => {
                providerRequestMetrics.push(metric);
                itemProviderMetrics.push(metric);
              },
            }
          : undefined
      );
      const outcome = await applyDecision(work, decision);
      finishLlmItem(outcome === "failed" ? "failed" : outcome === "skipped" ? "skipped" : "success");
      return outcome;
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
        ...(config.experimentEnabled
          ? { batchRunId: config.batchRunId, itemIndex: work.itemIndex, maskedJobId: work.maskedJobId }
          : { id: work.job.id }),
        error:
          evaluationError instanceof Error
            ? evaluationError.message
            : String(evaluationError),
        ...(config.experimentEnabled
          ? {
              providerStatus:
                evaluationError instanceof JobFitProviderHttpError
                  ? evaluationError.status
                  : undefined,
              retryAfterMs:
                evaluationError instanceof JobFitProviderHttpError
                  ? evaluationError.retryAfterMs
                  : undefined,
            }
          : providerError),
      });
      finishLlmItem("failed");
      return "failed";
    }
  };

  const llmSettled = await poolAllSettled(llmWork, llmConcurrency, processLlmOne);
  const counters = countOutcomes([
    ...preflightSettled,
    ...deterministicSettled,
    ...llmSettled,
  ]);
  const llmSuccessCount = llmSettled.filter(
    (result) =>
      result.status === "fulfilled" &&
      (result.value === "approved" || result.value === "rejected" || result.value === "pending")
  ).length;
  const success = counters.failed === 0;

  finishExperimentLog({
    jobs,
    deterministicWorkCount: deterministicWork.length,
    llmWorkCount: llmWork.length,
    llmSuccessCount,
    counters,
    success,
  });

  return {
    success,
    scanned: jobs.length,
    approved: counters.approved,
    rejected: counters.rejected,
    pending: counters.pending,
    failed: counters.failed,
    skipped: counters.skipped,
    error: providerRateLimitError,
  };
};
