/** Gemini `generateContent` HTTP: total attempts, backoff, per-request timeout. Env overrides in `providers.ts`. */
export const JOB_FIT_GEMINI_RETRY_DEFAULTS = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  timeoutMs: 60_000,
} as const;

export const JOB_FIT_CONFIG = {
  productionModel: "gemini-2.5-flash",
  policy: {
    costPriority: true,
    // approved: score >= 60, rejected: score <= 44, otherwise pending
    pendingRange: [45, 59] as const,
  },
  switchRule:
    "골든셋에서 오탐/미탐 임계치를 만족하는 한 비용 효율적인 Gemini 모델을 유지한다",
} as const;

export type BenchmarkThresholdConfig = {
  minPrecision: number;
  minRecall: number;
  minF1: number;
  maxDriftDelta: number;
};

export const JOB_FIT_BENCHMARK_THRESHOLDS: BenchmarkThresholdConfig = {
  minPrecision: 0.8,
  minRecall: 0.75,
  minF1: 0.77,
  maxDriftDelta: 0.08,
};
