import {
  JOB_FIT_BENCHMARK_THRESHOLDS,
  type BenchmarkThresholdConfig,
} from "../domain/config";

export type BenchmarkMetrics = {
  precision: number;
  recall: number;
  f1: number;
  driftDelta: number;
};

export type BenchmarkResult = {
  passed: boolean;
  failedChecks: string[];
  thresholds: BenchmarkThresholdConfig;
  metrics: BenchmarkMetrics;
};

export function evaluateBenchmarkPassFail(
  metrics: BenchmarkMetrics,
  thresholds: BenchmarkThresholdConfig = JOB_FIT_BENCHMARK_THRESHOLDS
): BenchmarkResult {
  const failedChecks: string[] = [];

  if (metrics.precision < thresholds.minPrecision) {
    failedChecks.push(`precision<${thresholds.minPrecision}`);
  }
  if (metrics.recall < thresholds.minRecall) {
    failedChecks.push(`recall<${thresholds.minRecall}`);
  }
  if (metrics.f1 < thresholds.minF1) {
    failedChecks.push(`f1<${thresholds.minF1}`);
  }
  if (metrics.driftDelta > thresholds.maxDriftDelta) {
    failedChecks.push(`driftDelta>${thresholds.maxDriftDelta}`);
  }

  return {
    passed: failedChecks.length === 0,
    failedChecks,
    thresholds,
    metrics,
  };
}
