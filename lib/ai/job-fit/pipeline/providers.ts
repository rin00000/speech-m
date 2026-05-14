import { fetchWithExponentialBackoff } from "@/lib/async/fetch-with-exponential-backoff";
import { JOB_FIT_CONFIG, JOB_FIT_GEMINI_RETRY_DEFAULTS } from "../domain/config";
import { jobFitResultSchema, type JobFitInput, type JobFitResult } from "../domain/schema";
import { buildSystemPrompt, buildUserPrompt } from "../policy/rules";

type ProviderResult = {
  model: string;
  parsed: JobFitResult;
  rawText: string;
};

const GEMINI_MODEL_PRIMARY =
  process.env.JOB_FIT_MODEL_GEMINI ?? JOB_FIT_CONFIG.productionModel;

const parseEnvInt = (raw: string | undefined, fallback: number, min: number): number => {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
};

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

const evaluateWithGemini = async (input: JobFitInput): Promise<ProviderResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL_PRIMARY)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithExponentialBackoff(
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
  );

  if (!response.ok) {
    throw new Error(`Gemini API failed: HTTP ${response.status}`);
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
