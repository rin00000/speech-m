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
const OPENAI_MODEL_FALLBACK =
  process.env.JOB_FIT_MODEL_OPENAI ?? JOB_FIT_CONFIG.backupModel;

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

const evaluateWithOpenAI = async (input: JobFitInput): Promise<ProviderResult> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL_FALLBACK,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(input.source) },
        {
          role: "user",
          content: buildUserPrompt(input),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed: HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawText = json.choices?.[0]?.message?.content ?? "";
  return {
    model: OPENAI_MODEL_FALLBACK,
    parsed: parseResult(rawText),
    rawText,
  };
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

export const evaluateByPriority = async (input: JobFitInput): Promise<ProviderResult> => {
  try {
    return await evaluateWithGemini(input);
  } catch (geminiError) {
    console.warn("[job-fit] Gemini fallback to OpenAI", geminiError);
    return evaluateWithOpenAI(input);
  }
};
