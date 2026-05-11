import { describe, expect, it } from "vitest";
import { evaluateBenchmarkPassFail } from "@/lib/ai/job-fit/benchmark";

describe("evaluateBenchmarkPassFail", () => {
  it("passes when all metrics meet thresholds", () => {
    const r = evaluateBenchmarkPassFail({
      precision: 0.9,
      recall: 0.8,
      f1: 0.85,
      driftDelta: 0.01,
    });
    expect(r.passed).toBe(true);
    expect(r.failedChecks).toHaveLength(0);
  });

  it("fails when precision is below minimum", () => {
    const r = evaluateBenchmarkPassFail({
      precision: 0.5,
      recall: 0.8,
      f1: 0.85,
      driftDelta: 0.01,
    });
    expect(r.passed).toBe(false);
    expect(r.failedChecks.some((c) => c.startsWith("precision"))).toBe(true);
  });
});
