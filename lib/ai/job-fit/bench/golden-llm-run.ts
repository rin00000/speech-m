import { readFile } from "node:fs/promises";
import { jobFitResultSchema, type JobFitInput } from "../domain/schema";
import { tryDeterministicDecision } from "../policy/deterministic";
import { buildSystemPrompt, buildUserPrompt } from "../policy/rules";

type GoldenRow = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  source: string;
  source_url: string;
  expected_label: "approved" | "rejected";
};

type BenchResult = {
  model: string;
  total: number;
  correct: number;
  fp: number;
  fn: number;
  accuracy: number;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.JOB_FIT_MODEL_GEMINI ?? "gemini-2.5-flash";

const rowToInput = (row: GoldenRow): JobFitInput => ({
  id: row.id,
  title: row.title,
  company: row.company,
  location: row.location,
  source: row.source,
  sourceUrl: row.source_url,
});

const extractJsonObject = (text: string): unknown => {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON payload");
  return JSON.parse(trimmed.slice(start, end + 1));
};

const parseJobFitLabel = (text: string): "approved" | "rejected" => {
  const json = extractJsonObject(text);
  const parsed = jobFitResultSchema.parse(json);
  return parsed.label;
};

const callGemini = async (row: GoldenRow): Promise<"approved" | "rejected"> => {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  const input = rowToInput(row);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
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
              {
                text: `${buildSystemPrompt(input.source)}\n\n${buildUserPrompt(input)}`,
              },
            ],
          },
        ],
      }),
    }
  );
  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseJobFitLabel(text);
};

const predictLabel = async (
  row: GoldenRow,
  llm: (row: GoldenRow) => Promise<"approved" | "rejected">
): Promise<"approved" | "rejected"> => {
  const input = rowToInput(row);
  const det = tryDeterministicDecision(input);
  if (det) return det.label;
  return llm(row);
};

const evaluate = async (
  model: string,
  rows: GoldenRow[],
  fn: (row: GoldenRow) => Promise<"approved" | "rejected">
): Promise<BenchResult> => {
  let correct = 0;
  let fp = 0;
  let fnCount = 0;

  for (const row of rows) {
    const predicted = await predictLabel(row, fn);
    if (predicted === row.expected_label) correct += 1;
    if (predicted === "approved" && row.expected_label === "rejected") fp += 1;
    if (predicted === "rejected" && row.expected_label === "approved") fnCount += 1;
  }

  return {
    model,
    total: rows.length,
    correct,
    fp,
    fn: fnCount,
    accuracy: rows.length === 0 ? 0 : Number(((correct / rows.length) * 100).toFixed(2)),
  };
};

const main = async () => {
  const raw = await readFile("data/job-fit/goldenset.sample.jsonl", "utf8");
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as GoldenRow);

  const results: BenchResult[] = [];

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required for bench:job-fit.");
  }
  results.push(await evaluate(GEMINI_MODEL, rows, callGemini));

  console.log(JSON.stringify({ results }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
