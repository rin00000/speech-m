import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type JsonLog = Record<string, unknown>;

const columns = [
  "experiment_name",
  "phase",
  "case",
  "repetition",
  "batch_run_id",
  "batch_limit",
  "llm_concurrency",
  "db_update_concurrency",
  "gemini_rpm_limit",
  "selected_count",
  "rule_processed_count",
  "llm_work_count",
  "llm_success_count",
  "provider_request_count",
  "provider_429_count",
  "skipped_count",
  "failed_count",
  "duration_ms",
  "lock_held_ms",
  "lock_ttl_ms",
  "queue_wait_avg_ms",
  "queue_wait_p95_ms",
  "provider_duration_avg_ms",
  "provider_duration_p95_ms",
  "memory_rss_delta_mb",
  "heap_used_delta_mb",
  "cpu_user_ms",
  "cpu_system_ms",
  "success",
  "started_at",
  "finished_at",
] as const;

const parseArgs = () => {
  const inputs: string[] = [];
  let outPath: string | null = null;
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--out") {
      outPath = args[++i] ?? null;
      continue;
    }
    inputs.push(arg);
  }

  return { inputs, outPath };
};

const parseJsonFromLine = (line: string): JsonLog | null => {
  const firstBrace = line.indexOf("{");
  const lastBrace = line.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;

  try {
    const parsed = JSON.parse(line.slice(firstBrace, lastBrace + 1)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonLog)
      : null;
  } catch {
    return null;
  }
};

const readInputText = (inputs: readonly string[]): string => {
  if (inputs.length === 0) {
    if (process.stdin.isTTY) {
      console.error(
        "Usage: npx tsx scripts/job-fit-experiment/parse-logs.ts <log-file...> --out docs/job-fit-experiment/results/raw-results.csv"
      );
      process.exit(1);
    }
    return readFileSync(0, "utf8");
  }

  return inputs.map((input) => readFileSync(input, "utf8")).join("\n");
};

const numberValue = (record: JsonLog, key: string): number | null => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const stringValue = (record: JsonLog, key: string): string | null => {
  const value = record[key];
  return typeof value === "string" ? value : null;
};

const boolValue = (record: JsonLog, key: string): boolean | null => {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
};

const percentile = (values: readonly number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
};

const average = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const csvEscape = (value: string | number | boolean | null): string => {
  if (value === null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const valueOrAggregate = (
  completed: JsonLog,
  key: string,
  values: readonly number[],
  aggregate: "avg" | "p95"
): number => {
  const logged = numberValue(completed, key);
  if (logged !== null) return logged;
  return Math.round(aggregate === "avg" ? average(values) : percentile(values, 95));
};

const buildRows = (logs: readonly JsonLog[]): string[][] => {
  const itemsByRun = new Map<string, JsonLog[]>();
  const completedEvents: JsonLog[] = [];

  for (const log of logs) {
    const event = stringValue(log, "event");
    if (event === "job_fit_llm_item_completed") {
      const batchRunId = stringValue(log, "batchRunId");
      if (!batchRunId) continue;
      itemsByRun.set(batchRunId, [...(itemsByRun.get(batchRunId) ?? []), log]);
    }
    if (event === "job_fit_batch_completed") {
      completedEvents.push(log);
    }
  }

  return completedEvents.map((completed) => {
    const batchRunId = stringValue(completed, "batchRunId") ?? "";
    const items = itemsByRun.get(batchRunId) ?? [];
    const queueWaitValues = items
      .map((item) => numberValue(item, "queueWaitMs"))
      .filter((value): value is number => value !== null);
    const providerDurationValues = items
      .map((item) => numberValue(item, "providerDurationMs"))
      .filter((value): value is number => value !== null);

    const values: Record<(typeof columns)[number], string | number | boolean | null> = {
      experiment_name: stringValue(completed, "experimentName"),
      phase: stringValue(completed, "experimentPhase"),
      case: stringValue(completed, "experimentCase"),
      repetition: numberValue(completed, "repetition"),
      batch_run_id: batchRunId,
      batch_limit: numberValue(completed, "batchLimit"),
      llm_concurrency: numberValue(completed, "llmConcurrency"),
      db_update_concurrency: numberValue(completed, "dbUpdateConcurrency"),
      gemini_rpm_limit: numberValue(completed, "geminiRpmLimit"),
      selected_count: numberValue(completed, "selectedCount"),
      rule_processed_count: numberValue(completed, "ruleProcessedCount"),
      llm_work_count: numberValue(completed, "llmWorkCount"),
      llm_success_count: numberValue(completed, "llmSuccessCount"),
      provider_request_count:
        numberValue(completed, "providerRequestCount") ?? providerDurationValues.length,
      provider_429_count: numberValue(completed, "provider429Count"),
      skipped_count: numberValue(completed, "skippedCount"),
      failed_count: numberValue(completed, "failedCount"),
      duration_ms: numberValue(completed, "durationMs"),
      lock_held_ms: numberValue(completed, "lockHeldMs"),
      lock_ttl_ms: numberValue(completed, "lockTtlMs"),
      queue_wait_avg_ms: valueOrAggregate(
        completed,
        "queueWaitAvgMs",
        queueWaitValues,
        "avg"
      ),
      queue_wait_p95_ms: valueOrAggregate(
        completed,
        "queueWaitP95Ms",
        queueWaitValues,
        "p95"
      ),
      provider_duration_avg_ms: valueOrAggregate(
        completed,
        "providerDurationAvgMs",
        providerDurationValues,
        "avg"
      ),
      provider_duration_p95_ms: valueOrAggregate(
        completed,
        "providerDurationP95Ms",
        providerDurationValues,
        "p95"
      ),
      memory_rss_delta_mb: numberValue(completed, "memoryRssDeltaMb"),
      heap_used_delta_mb: numberValue(completed, "heapUsedDeltaMb"),
      cpu_user_ms: numberValue(completed, "cpuUserMs"),
      cpu_system_ms: numberValue(completed, "cpuSystemMs"),
      success: boolValue(completed, "success"),
      started_at: stringValue(completed, "startedAt"),
      finished_at: stringValue(completed, "finishedAt"),
    };

    return columns.map((column) => csvEscape(values[column]));
  });
};

const main = () => {
  const { inputs, outPath } = parseArgs();
  const text = readInputText(inputs);
  const logs = text
    .split(/\r?\n/)
    .map(parseJsonFromLine)
    .filter((log): log is JsonLog => log !== null);
  const rows = buildRows(logs);
  const csv = [columns.join(","), ...rows.map((row) => row.join(","))].join("\n");

  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${csv}\n`, "utf8");
    return;
  }

  process.stdout.write(`${csv}\n`);
};

main();
