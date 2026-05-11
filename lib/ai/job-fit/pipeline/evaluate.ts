import { toFinalStatus, type JobFitDecision, type JobFitInput } from "../domain/schema";
import { tryDeterministicDecision } from "../policy/deterministic";
import { JOB_FIT_PROMPT_VERSION } from "../policy/rules";
import { evaluateByPriority } from "./providers";

/** LLM 호출 후 `toFinalStatus`로 DB `status`와 동일한 3값(pending|approved|rejected)을 맞춘다. 점수 경계는 `domain/config`·`domain/schema`의 `toFinalStatus`와 일치해야 한다. */
export const evaluateJobFit = async (input: JobFitInput): Promise<JobFitDecision> => {
  const deterministic = tryDeterministicDecision(input);
  if (deterministic) {
    return {
      ...deterministic,
      finalStatus: toFinalStatus(deterministic),
      model: "deterministic",
      promptVersion: JOB_FIT_PROMPT_VERSION,
    };
  }

  const result = await evaluateByPriority(input);
  return {
    ...result.parsed,
    finalStatus: toFinalStatus(result.parsed),
    model: result.model,
    promptVersion: JOB_FIT_PROMPT_VERSION,
  };
};
