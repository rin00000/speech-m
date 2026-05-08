import { readFile } from "node:fs/promises";

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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.JOB_FIT_MODEL_GEMINI ?? "gemini-2.5-flash";
const OPENAI_MODEL = process.env.JOB_FIT_MODEL_OPENAI ?? "gpt-4.1-mini";

const systemPrompt = [
  "너는 방송아카데미 채용 공고 심사관이다.",
  "아나운서/앵커/기상캐스터 중심이면 approved, 아니면 rejected.",
  "취재기자, 유튜브 전용, 소형 에이전시는 rejected 우선.",
  'JSON 형식으로만 응답: {"label":"approved|rejected","score":0-100}',
].join("\n");

const parseLabel = (text: string): "approved" | "rejected" => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON payload");
  const parsed = JSON.parse(text.slice(start, end + 1)) as {
    label?: "approved" | "rejected";
  };
  if (parsed.label !== "approved" && parsed.label !== "rejected") {
    throw new Error("Invalid label");
  }
  return parsed.label;
};

const callOpenAI = async (row: GoldenRow): Promise<"approved" | "rejected"> => {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `title=${row.title}\ncompany=${row.company ?? "unknown"}\nlocation=${row.location ?? "unknown"}\nsource=${row.source}\nurl=${row.source_url}`,
        },
      ],
    }),
  });
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  return parseLabel(text);
};

const callGemini = async (row: GoldenRow): Promise<"approved" | "rejected"> => {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
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
                text: `${systemPrompt}\n\ntitle=${row.title}\ncompany=${row.company ?? "unknown"}\nlocation=${row.location ?? "unknown"}\nsource=${row.source}\nurl=${row.source_url}`,
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
  return parseLabel(text);
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
    const predicted = await fn(row);
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

  if (GEMINI_API_KEY) {
    results.push(await evaluate(GEMINI_MODEL, rows, callGemini));
  } else {
    console.warn("skip Gemini benchmark: GEMINI_API_KEY missing");
  }

  if (OPENAI_API_KEY) {
    results.push(await evaluate(OPENAI_MODEL, rows, callOpenAI));
  } else {
    console.warn("skip OpenAI benchmark: OPENAI_API_KEY missing");
  }

  if (results.length === 0) {
    throw new Error(
      "No benchmark run. Set GEMINI_API_KEY or OPENAI_API_KEY."
    );
  }

  console.log(JSON.stringify({ results }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
