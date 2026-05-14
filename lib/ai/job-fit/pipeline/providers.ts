import { JOB_FIT_CONFIG } from "../domain/config";
import { jobFitResultSchema, type JobFitInput, type JobFitResult } from "../domain/schema";
import { buildSystemPrompt, buildUserPrompt } from "../policy/rules";

type ProviderResult = {
  model: string;
  parsed: JobFitResult;
  rawText: string;
};

const GEMINI_MODEL_PRIMARY =
  process.env.JOB_FIT_MODEL_GEMINI ?? JOB_FIT_CONFIG.productionModel;

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
  const response = await fetch(endpoint, {
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
  });

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
