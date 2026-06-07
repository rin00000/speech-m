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
const DEFAULT_GEMINI_RPM_LIMIT = 10;
const MAX_PROVIDER_ERROR_DETAIL_LENGTH = 300;
let geminiQueue = Promise.resolve();
let nextGeminiRequestAt = 0;

const parseEnvInt = (raw: string | undefined, fallback: number, min: number): number => {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
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

const resolveGeminiMinIntervalMs = (): number => {
  if (process.env.JOB_FIT_GEMINI_MIN_INTERVAL_MS !== undefined) {
    return parseEnvInt(process.env.JOB_FIT_GEMINI_MIN_INTERVAL_MS, 0, 0);
  }

  const rpmLimit = parseEnvInt(
    process.env.JOB_FIT_GEMINI_RPM_LIMIT,
    DEFAULT_GEMINI_RPM_LIMIT,
    1
  );
  return Math.ceil(60_000 / rpmLimit);
};

const runWithGeminiRateLimit = async <T>(operation: () => Promise<T>): Promise<T> => {
  const minIntervalMs = resolveGeminiMinIntervalMs();
  if (minIntervalMs <= 0) return operation();

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

  return operation();
};

const extendGeminiCooldown = (response: Response): void => {
  const retryAfterDelayMs = resolveRetryAfterDelayMs(response.headers.get("retry-after"));
  const fallbackDelayMs = Math.max(resolveGeminiMinIntervalMs() * 2, 10_000);
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

const evaluateWithGemini = async (input: JobFitInput): Promise<ProviderResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL_PRIMARY)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await runWithGeminiRateLimit(() =>
    fetchWithExponentialBackoff(
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
              parts: [{ text: `${buildSystemPrompt(input.source)}\n\n${buildUserPrompt(input)}` }],
            },
          ],
        }),
        cache: "no-store",
      },
      resolveGeminiFetchRetryOptions()
    )
  );

  if (!response.ok) {
    const retryAfterMs = resolveRetryAfterDelayMs(response.headers.get("retry-after"));
    const detail = await readProviderErrorDetail(response);
    if (response.status === 429) {
      extendGeminiCooldown(response);
    }
    throw new JobFitProviderHttpError("Gemini", response.status, detail, retryAfterMs);
  }

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return {
    model: GEMINI_MODEL_PRIMARY,
    parsed: parseResult(rawText),
    rawText,
  };
};

export const evaluateByPriority = async (input: JobFitInput): Promise<ProviderResult> =>
  evaluateWithGemini(input);
