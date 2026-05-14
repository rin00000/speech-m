import { z } from "zod";

export const jobFitLabelSchema = z.enum(["approved", "rejected"]);

/** When the LLM omits or empties `matched_rules`, parsing substitutes this tag for observability. */
export const LLM_MATCHED_RULES_FALLBACK = "llm_matched_rules_fallback" as const;

const jobFitLlmRowSchema = z.object({
  label: jobFitLabelSchema,
  score: z.number().min(0).max(100),
  reasons: z.array(z.string().min(1)).min(1).max(5),
  matched_rules: z.array(z.string().min(1)).max(8).optional().default([]),
});

export const jobFitResultSchema = jobFitLlmRowSchema.transform((row) => ({
  ...row,
  matched_rules:
    row.matched_rules.length > 0 ? row.matched_rules : [LLM_MATCHED_RULES_FALLBACK],
}));

export type JobFitResult = z.infer<typeof jobFitResultSchema>;

export type JobFitInput = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  source: string;
  sourceUrl: string;
};

export type JobFitDecision = JobFitResult & {
  finalStatus: "pending" | "approved" | "rejected";
  model: string;
  promptVersion: string;
};

/**
 * AI 1차 판정 경계: `JOB_FIT_CONFIG.policy`·`evaluateJobFit`와 동일해야 한다.
 * 60+이면서 approved 라벨 → 자동 승인, 44 이하이면서 rejected 라벨 → 자동 거절, 그 외 → pending(관리자 HITL).
 */
export const toFinalStatus = (result: JobFitResult): JobFitDecision["finalStatus"] => {
  if (result.score >= 60 && result.label === "approved") return "approved";
  if (result.score <= 44 && result.label === "rejected") return "rejected";
  return "pending";
};
