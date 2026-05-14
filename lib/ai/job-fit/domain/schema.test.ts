import { describe, expect, it } from "vitest";
import { jobFitResultSchema, LLM_MATCHED_RULES_FALLBACK, toFinalStatus } from "./schema";

describe("jobFitResultSchema", () => {
  it("fills matched_rules when the LLM returns an empty array", () => {
    const parsed = jobFitResultSchema.parse({
      label: "rejected",
      score: 40,
      reasons: ["x"],
      matched_rules: [],
    });
    expect(parsed.matched_rules).toEqual([LLM_MATCHED_RULES_FALLBACK]);
  });

  it("fills matched_rules when the field is omitted", () => {
    const parsed = jobFitResultSchema.parse({
      label: "approved",
      score: 80,
      reasons: ["y"],
    });
    expect(parsed.matched_rules).toEqual([LLM_MATCHED_RULES_FALLBACK]);
  });
});

describe("toFinalStatus", () => {
  it("auto-approves high-score approved label", () => {
    expect(
      toFinalStatus({
        label: "approved",
        score: 60,
        reasons: ["r"],
        matched_rules: ["m"],
      })
    ).toBe("approved");
  });

  it("auto-rejects low-score rejected label", () => {
    expect(
      toFinalStatus({
        label: "rejected",
        score: 44,
        reasons: ["r"],
        matched_rules: ["m"],
      })
    ).toBe("rejected");
  });

  it("defers ambiguous scores to pending for HITL", () => {
    expect(
      toFinalStatus({
        label: "approved",
        score: 45,
        reasons: ["r"],
        matched_rules: ["m"],
      })
    ).toBe("pending");
  });
});
