import {
  toFinalStatus,
  type JobFitDecision,
  type JobFitInput,
  type JobFitResult,
} from "../domain/schema";
import { tryDeterministicDecision } from "../policy/deterministic";
import { JOB_FIT_PROMPT_VERSION } from "../policy/rules";
import { evaluateByPriority, type EvaluateByPriorityOptions } from "./providers";

const buildJobFitDecision = (result: JobFitResult, model: string): JobFitDecision => ({
  ...result,
  finalStatus: toFinalStatus(result),
  model,
  promptVersion: JOB_FIT_PROMPT_VERSION,
});

export const evaluateDeterministicJobFit = (input: JobFitInput): JobFitDecision | null => {
  const deterministic = tryDeterministicDecision(input);
  return deterministic ? buildJobFitDecision(deterministic, "deterministic") : null;
};

export const evaluateLlmJobFit = async (
  input: JobFitInput,
  options?: EvaluateByPriorityOptions
): Promise<JobFitDecision> => {
  const result =
    options === undefined
      ? await evaluateByPriority(input)
      : await evaluateByPriority(input, options);
  return buildJobFitDecision(result.parsed, result.model);
};

/** LLM 호출 후 `toFinalStatus`로 DB `status`와 동일한 3값(pending|approved|rejected)을 맞춘다. 점수 경계는 `domain/config`·`domain/schema`의 `toFinalStatus`와 일치해야 한다. */
export const evaluateJobFit = async (input: JobFitInput): Promise<JobFitDecision> => {
  const deterministic = evaluateDeterministicJobFit(input);
  return deterministic ?? evaluateLlmJobFit(input);
};
