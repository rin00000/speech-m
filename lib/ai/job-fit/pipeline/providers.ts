/**
 * Job-Fit LLM 공급자 통합 모듈.
 * Gemini 호출, 속도 제한, 재시도 메타데이터 추출을 담당하며 evaluateByPriority가 배치 파이프라인의 진입점이다.
 */

import {
  fetchWithExponentialBackoff,
  resolveRetryAfterDelayMs,
} from "@/lib/async/fetch-with-exponential-backoff";
import { JOB_FIT_CONFIG, JOB_FIT_GEMINI_RETRY_DEFAULTS } from "../domain/config";
import { jobFitResultSchema, type JobFitInput, type JobFitResult } from "../domain/schema";
import { buildSystemPrompt, buildUserPrompt } from "../policy/rules";

type ProviderResult = {
  model: string;
  parsed: JobFitResult;
  rawText: string;
};

export type JobFitProviderRequestMetrics = {
  provider: string;
  queueWaitMs: number;
  providerDurationMs: number;
  status: number | null;
  retryAfterMs: number | null;
};

export type EvaluateByPriorityOptions = {
  onProviderRequest?: (metrics: JobFitProviderRequestMetrics) => void;
  strictRateLimit?: boolean;
};

export type JobFitGeminiRateLimitSettings = {
  rpmLimit: number;
  minIntervalMs: number;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
    safetyRatings?: Array<{ category?: string; probability?: string }>;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class JobFitProviderHttpError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
    readonly detail?: string,
    readonly retryAfterMs?: number | null
  ) {
    super(`${provider} API failed: HTTP ${status}`);
    this.name = "JobFitProviderHttpError";
  }
}

const GEMINI_MODEL_PRIMARY =
  process.env.JOB_FIT_MODEL_GEMINI ?? JOB_FIT_CONFIG.productionModel;

// `JOB_FIT_GEMINI_RPM_LIMIT`: 1분 동안 시작할 Gemini 요청 수의 상한.
// 응답 완료 수가 아니라 요청 시작 간격을 계산하는 값이며, 기본 10이면 약 6초마다 시작한다.
export const DEFAULT_GEMINI_RPM_LIMIT = 10;
const MAX_EXPERIMENT_GEMINI_RPM_LIMIT = DEFAULT_GEMINI_RPM_LIMIT;
const MAX_PROVIDER_ERROR_DETAIL_LENGTH = 300;
let geminiQueue = Promise.resolve();
let nextGeminiRequestAt = 0;

const parseEnvInt = (raw: string | undefined, fallback: number, min: number): number => {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
};

const pushConfigWarning = (warnings: string[] | undefined, message: string): void => {
  warnings?.push(message);
};

const parseStrictPositiveInt = (
  name: string,
  fallback: number,
  warnings: string[] | undefined
): number => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || `${n}` !== raw.trim() || n <= 0) {
    pushConfigWarning(warnings, `${name} must be a positive integer. Using ${fallback}.`);
    return fallback;
  }
  return n;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const resolveGeminiFetchRetryOptions = () => ({
  maxAttempts: parseEnvInt(process.env.JOB_FIT_GEMINI_MAX_ATTEMPTS, JOB_FIT_GEMINI_RETRY_DEFAULTS.maxAttempts, 1),
  baseDelayMs: parseEnvInt(
    process.env.JOB_FIT_GEMINI_BACKOFF_BASE_MS,
    JOB_FIT_GEMINI_RETRY_DEFAULTS.baseDelayMs,
    0
  ),
  maxDelayMs: parseEnvInt(
    process.env.JOB_FIT_GEMINI_BACKOFF_MAX_MS,
    JOB_FIT_GEMINI_RETRY_DEFAULTS.maxDelayMs,
    0
  ),
  timeoutMs: parseEnvInt(
    process.env.JOB_FIT_GEMINI_TIMEOUT_MS,
    JOB_FIT_GEMINI_RETRY_DEFAULTS.timeoutMs,
    1000
  ),
});

export const resolveJobFitGeminiRateLimitSettings = (
  warnings?: string[],
  strictExperiment = false
): JobFitGeminiRateLimitSettings => {
  let rpmLimit = strictExperiment
    ? parseStrictPositiveInt("JOB_FIT_GEMINI_RPM_LIMIT", DEFAULT_GEMINI_RPM_LIMIT, warnings)
    : parseEnvInt(process.env.JOB_FIT_GEMINI_RPM_LIMIT, DEFAULT_GEMINI_RPM_LIMIT, 1);

  if (strictExperiment && rpmLimit > MAX_EXPERIMENT_GEMINI_RPM_LIMIT) {
    pushConfigWarning(
      warnings,
      `JOB_FIT_GEMINI_RPM_LIMIT exceeds the experiment safety cap (${MAX_EXPERIMENT_GEMINI_RPM_LIMIT}). Using ${MAX_EXPERIMENT_GEMINI_RPM_LIMIT}.`
    );
    rpmLimit = MAX_EXPERIMENT_GEMINI_RPM_LIMIT;
  }

  const rpmDerivedMinIntervalMs = Math.ceil(60_000 / rpmLimit);
  if (process.env.JOB_FIT_GEMINI_MIN_INTERVAL_MS !== undefined) {
    const minIntervalMs = strictExperiment
      ? parseStrictPositiveInt(
          "JOB_FIT_GEMINI_MIN_INTERVAL_MS",
          rpmDerivedMinIntervalMs,
          warnings
        )
      : parseEnvInt(process.env.JOB_FIT_GEMINI_MIN_INTERVAL_MS, 0, 0);
    return { rpmLimit, minIntervalMs };
  }

  return { rpmLimit, minIntervalMs: rpmDerivedMinIntervalMs };
};

const resolveGeminiMinIntervalMs = (strictRateLimit = false): number =>
  resolveJobFitGeminiRateLimitSettings(undefined, strictRateLimit).minIntervalMs;

const runWithGeminiRateLimit = async <T>(
  operation: () => Promise<T>,
  onStarted?: (queueWaitMs: number) => void,
  strictRateLimit = false
): Promise<T> => {
  const queuedAt = performance.now();
  const minIntervalMs = resolveGeminiMinIntervalMs(strictRateLimit);
  if (minIntervalMs <= 0) {
    onStarted?.(0);
    return operation();
  }

  const previous = geminiQueue;
  let release = () => {};
  geminiQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  const waitMs = Math.max(0, nextGeminiRequestAt - Date.now());
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  nextGeminiRequestAt = Date.now() + minIntervalMs;
  release();
  onStarted?.(performance.now() - queuedAt);

  return operation();
};

const extendGeminiCooldown = (response: Response, strictRateLimit = false): void => {
  const retryAfterDelayMs = resolveRetryAfterDelayMs(response.headers.get("retry-after"));
  const fallbackDelayMs = Math.max(resolveGeminiMinIntervalMs(strictRateLimit) * 2, 10_000);
  const cooldownMs = retryAfterDelayMs ?? fallbackDelayMs;

  nextGeminiRequestAt = Math.max(nextGeminiRequestAt, Date.now() + cooldownMs);
};

const extractJson = (text: string): unknown => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("LLM empty response");
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("LLM response does not contain JSON object");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
};

const parseResult = (rawText: string): JobFitResult => {
  const json = extractJson(rawText);
  return jobFitResultSchema.parse(json);
};

const truncateProviderErrorDetail = (detail: string): string =>
  detail.length > MAX_PROVIDER_ERROR_DETAIL_LENGTH
    ? `${detail.slice(0, MAX_PROVIDER_ERROR_DETAIL_LENGTH)}...`
    : detail;

const readProviderErrorDetail = async (response: Response): Promise<string | undefined> => {
  const text = await response.text().catch(() => "");
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    const error = json.error;
    if (error && typeof error === "object") {
      const errorRecord = error as Record<string, unknown>;
      const status = typeof errorRecord.status === "string" ? errorRecord.status : undefined;
      const message =
        typeof errorRecord.message === "string" ? errorRecord.message : undefined;
      const detail = [status, message].filter(Boolean).join(": ");
      if (detail) return truncateProviderErrorDetail(detail);
    }
  } catch {
    // Fall through to the raw body below.
  }

  return truncateProviderErrorDetail(trimmed.replace(/\s+/g, " "));
};

const formatGeminiTokenCount = (name: string, value: unknown): string | null =>
  typeof value === "number" ? `${name}=${value}` : null;

const readGeminiText = (json: GeminiGenerateContentResponse): string =>
  json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text): text is string => typeof text === "string")
    .join("") ?? "";

const buildGeminiEmptyContentDetail = (json: GeminiGenerateContentResponse): string => {
  const candidate = json.candidates?.[0];
  const usage = json.usageMetadata;
  const safety = candidate?.safetyRatings
    ?.map((rating) =>
      [rating.category, rating.probability].filter(Boolean).join(":")
    )
    .filter(Boolean)
    .join(",");

  return truncateProviderErrorDetail(
    [
      "empty candidate content",
      typeof candidate?.finishReason === "string"
        ? `finishReason=${candidate.finishReason}`
        : null,
      `candidates=${json.candidates?.length ?? 0}`,
      formatGeminiTokenCount("promptTokens", usage?.promptTokenCount),
      formatGeminiTokenCount("candidateTokens", usage?.candidatesTokenCount),
      formatGeminiTokenCount("totalTokens", usage?.totalTokenCount),
      safety ? `safety=${safety}` : null,
    ]
      .filter(Boolean)
      .join("; ")
  );
};

const evaluateWithGemini = async (
  input: JobFitInput,
  options: EvaluateByPriorityOptions = {}
): Promise<ProviderResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL_PRIMARY)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let queueWaitMs = 0;
  let providerStartedAt = 0;
  let providerDurationMs = 0;
  let providerStatus: number | null = null;
  let retryAfterMs: number | null = null;

  try {
    const response = await runWithGeminiRateLimit(
      () => {
        providerStartedAt = performance.now();
        return fetchWithExponentialBackoff(
          endpoint,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              generationConfig: {
                temperature: 0,
                responseMimeType: "application/json",
              },
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: `${buildSystemPrompt(input.source)}\n\n${buildUserPrompt(input)}` },
                  ],
                },
              ],
            }),
            cache: "no-store",
          },
          resolveGeminiFetchRetryOptions()
        );
      },
      (waitMs) => {
        queueWaitMs = waitMs;
      },
      options.strictRateLimit === true
    );
    providerDurationMs = providerStartedAt > 0 ? performance.now() - providerStartedAt : 0;
    providerStatus = response.status;
    retryAfterMs = resolveRetryAfterDelayMs(response.headers.get("retry-after"));

    if (!response.ok) {
      const detail = await readProviderErrorDetail(response);
      if (response.status === 429) {
        extendGeminiCooldown(response, options.strictRateLimit === true);
      }
      throw new JobFitProviderHttpError("Gemini", response.status, detail, retryAfterMs);
    }

    const json = (await response.json()) as GeminiGenerateContentResponse;
    const rawText = readGeminiText(json);
    if (!rawText.trim()) {
      throw new JobFitProviderHttpError(
        "Gemini",
        response.status,
        buildGeminiEmptyContentDetail(json),
        null
      );
    }

    return {
      model: GEMINI_MODEL_PRIMARY,
      parsed: parseResult(rawText),
      rawText,
    };
  } catch (error) {
    if (providerStartedAt > 0 && providerDurationMs === 0) {
      providerDurationMs = performance.now() - providerStartedAt;
    }
    if (error instanceof JobFitProviderHttpError) {
      providerStatus = error.status;
      retryAfterMs = error.retryAfterMs ?? retryAfterMs;
    }
    throw error;
  } finally {
    options.onProviderRequest?.({
      provider: "Gemini",
      queueWaitMs: Math.round(queueWaitMs),
      providerDurationMs: Math.round(providerDurationMs),
      status: providerStatus,
      retryAfterMs,
    });
  }
};

export const evaluateByPriority = async (
  input: JobFitInput,
  options?: EvaluateByPriorityOptions
): Promise<ProviderResult> => evaluateWithGemini(input, options);
