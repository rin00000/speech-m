import { evaluateByPriority } from "@/lib/ai/job-fit/providers";
import { JOB_FIT_PROMPT_VERSION } from "@/lib/ai/job-fit/rules";
import { toFinalStatus, type JobFitDecision, type JobFitInput } from "@/lib/ai/job-fit/schema";

/** LLM 호출 후 `toFinalStatus`로 DB `status`와 동일한 3값(pending|approved|rejected)을 맞춘다. 점수 경계는 `lib/ai/job-fit/config`·`schema`의 `toFinalStatus`와 일치해야 한다. */
export const evaluateJobFit = async (input: JobFitInput): Promise<JobFitDecision> => {
  const result = await evaluateByPriority(input);
  return {
    ...result.parsed,
    finalStatus: toFinalStatus(result.parsed),
    model: result.model,
    promptVersion: JOB_FIT_PROMPT_VERSION,
  };
};
