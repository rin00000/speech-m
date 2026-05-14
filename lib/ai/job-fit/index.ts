/** Public entrypoints for job-fit. Prefer `@/lib/ai/job-fit` over deep paths in app code. */

export { evaluateJobFit } from "./pipeline/evaluate";
export { runJobFitBatch, type RunJobFitBatchResult } from "./pipeline/batch";
export { evaluateByPriority } from "./pipeline/providers";

export {
  evaluateBenchmarkPassFail,
  type BenchmarkMetrics,
  type BenchmarkResult,
} from "./bench/benchmark";

export {
  JOB_FIT_CONFIG,
  JOB_FIT_BENCHMARK_THRESHOLDS,
  type BenchmarkThresholdConfig,
} from "./domain/config";

export {
  jobFitLabelSchema,
  jobFitResultSchema,
  toFinalStatus,
  type JobFitDecision,
  type JobFitInput,
  type JobFitResult,
} from "./domain/schema";

export {
  aiFitSnapshotStoredSchema,
  buildAiFitSnapshotPayload,
  parseAiFitSnapshot,
  type AiFitSnapshotStored,
} from "./domain/ai-fit-snapshot";

export {
  JOB_FIT_PROMPT_VERSION,
  JOB_FIT_INTERN_SOURCE,
  JOB_FIT_INTERN_ALLOWED_KEYWORDS,
  JOB_FIT_BLOCK_COMPANIES,
  JOB_FIT_TITLE_HARD_EXCLUDE,
  JOB_FIT_KEYWORD_HARD_EXCLUDE,
  JOB_FIT_TITLE_ENTERTAINMENT,
  JOB_FIT_POSITIVE_SIGNALS,
  JOB_FIT_RULES,
  buildSystemPrompt,
  buildUserPrompt,
} from "./policy/rules";

export { tryDeterministicDecision } from "./policy/deterministic";

export {
  foldCase,
  fieldTextMatches,
  latinRuns,
  companyMatchesBlocklist,
  companyMatchesBroadcaster,
  titleMatchesAnyKeyword,
  isShortAsciiKeyword,
  SHORT_ASCII_MAX_LEN,
} from "./policy/keyword-match";
