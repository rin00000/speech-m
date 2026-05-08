import { evaluateByPriority } from "@/lib/ai/job-fit/providers";
import { JOB_FIT_PROMPT_VERSION } from "@/lib/ai/job-fit/rules";
import { toFinalStatus, type JobFitDecision, type JobFitInput } from "@/lib/ai/job-fit/schema";

export const evaluateJobFit = async (input: JobFitInput): Promise<JobFitDecision> => {
  const result = await evaluateByPriority(input);
  return {
    ...result.parsed,
    finalStatus: toFinalStatus(result.parsed),
    model: result.model,
    promptVersion: JOB_FIT_PROMPT_VERSION,
  };
};
