import { describe, expect, it } from "vitest";
import { toFinalStatus } from "@/lib/ai/job-fit/schema";

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
