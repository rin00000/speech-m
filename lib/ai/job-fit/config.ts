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
