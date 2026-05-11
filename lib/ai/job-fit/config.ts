export const JOB_FIT_CONFIG = {
  productionModel: "gemini-2.5-flash",
  backupModel: "gpt-4.1-mini",
  policy: {
    costPriority: true,
    // approved: score >= 60, rejected: score <= 44, otherwise pending
    pendingRange: [45, 59] as const,
  },
  switchRule:
    "골든셋에서 동일 오탐/미탐 임계치를 만족하면 더 저렴한 모델로 교체(기본: Gemini 우선)",
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
