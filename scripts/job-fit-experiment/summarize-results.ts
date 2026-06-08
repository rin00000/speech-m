import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type CsvRow = Record<string, string>;
type RunMetric = {
  durationMs: number;
  throughput: number;
  llmThroughput: number;
  failureRate: number;
  skipRate: number;
  ttlUtilization: number;
  queueWaitAvgMs: number;
  queueWaitP95Ms: number;
  providerDurationAvgMs: number;
  providerDurationP95Ms: number;
  memoryRssDeltaMb: number;
  heapUsedDeltaMb: number;
  cpuUserMs: number;
  cpuSystemMs: number;
  success: boolean;
  has429: boolean;
};

const DEFAULT_INPUT = "docs/job-fit-experiment/results/raw-results.csv";

const parseArgs = () => {
  const args = process.argv.slice(2);
  let input = DEFAULT_INPUT;
  let outPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--out") {
      outPath = args[++i] ?? null;
      continue;
    }
    input = arg;
  }

  return { input, outPath };
};

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += char;
  }

  cells.push(cell);
  return cells;
};

const parseCsv = (text: string): CsvRow[] => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
};

const toNumber = (row: CsvRow, key: string): number => {
  const n = Number(row[key]);
  return Number.isFinite(n) ? n : 0;
};

const safeDivide = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

const average = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const percentile = (values: readonly number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
};

const stddev = (values: readonly number[]): number => {
  if (values.length <= 1) return 0;
  const avg = average(values);
  const variance = average(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
};

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(3);
};

const groupKey = (row: CsvRow): string =>
  [
    row.phase,
    row.case,
    row.batch_limit,
    row.llm_concurrency,
    row.db_update_concurrency,
    row.gemini_rpm_limit,
  ].join("|");

const labelForGroup = (rows: readonly CsvRow[]): string => {
  const first = rows[0];
  return [
    `phase=${first.phase || "-"}`,
    `case=${first.case || "-"}`,
    `batch=${first.batch_limit || "-"}`,
    `llmConcurrency=${first.llm_concurrency || "-"}`,
    `dbUpdateConcurrency=${first.db_update_concurrency || "-"}`,
    `rpm=${first.gemini_rpm_limit || "-"}`,
  ].join(", ");
};

const toRunMetric = (row: CsvRow): RunMetric => {
  const durationMs = toNumber(row, "duration_ms");
  const durationSeconds = durationMs / 1000;
  const selectedCount = toNumber(row, "selected_count");
  const failedCount = toNumber(row, "failed_count");
  const skippedCount = toNumber(row, "skipped_count");
  const completedCount = Math.max(0, selectedCount - failedCount - skippedCount);
  const llmWorkCount = toNumber(row, "llm_work_count");
  const llmSuccessCount = toNumber(row, "llm_success_count");
  const lockTtlMs = toNumber(row, "lock_ttl_ms");

  return {
    durationMs,
    throughput: safeDivide(completedCount, durationSeconds),
    llmThroughput: safeDivide(llmSuccessCount, durationSeconds),
    failureRate: safeDivide(failedCount, selectedCount),
    skipRate: safeDivide(skippedCount, llmWorkCount),
    ttlUtilization: safeDivide(toNumber(row, "lock_held_ms"), lockTtlMs),
    queueWaitAvgMs: toNumber(row, "queue_wait_avg_ms"),
    queueWaitP95Ms: toNumber(row, "queue_wait_p95_ms"),
    providerDurationAvgMs: toNumber(row, "provider_duration_avg_ms"),
    providerDurationP95Ms: toNumber(row, "provider_duration_p95_ms"),
    memoryRssDeltaMb: toNumber(row, "memory_rss_delta_mb"),
    heapUsedDeltaMb: toNumber(row, "heap_used_delta_mb"),
    cpuUserMs: toNumber(row, "cpu_user_ms"),
    cpuSystemMs: toNumber(row, "cpu_system_ms"),
    success: row.success === "true",
    has429: toNumber(row, "provider_429_count") > 0,
  };
};

const metricRows = (metrics: readonly RunMetric[]): Array<[string, number[]]> => [
  ["duration_ms", metrics.map((metric) => metric.durationMs)],
  ["throughput", metrics.map((metric) => metric.throughput)],
  ["llm_throughput", metrics.map((metric) => metric.llmThroughput)],
  ["failure_rate", metrics.map((metric) => metric.failureRate)],
  ["skip_rate", metrics.map((metric) => metric.skipRate)],
  ["ttl_utilization", metrics.map((metric) => metric.ttlUtilization)],
  ["queue_wait_avg_ms", metrics.map((metric) => metric.queueWaitAvgMs)],
  ["queue_wait_p95_ms", metrics.map((metric) => metric.queueWaitP95Ms)],
  ["provider_duration_avg_ms", metrics.map((metric) => metric.providerDurationAvgMs)],
  ["provider_duration_p95_ms", metrics.map((metric) => metric.providerDurationP95Ms)],
  ["memory_rss_delta_mb", metrics.map((metric) => metric.memoryRssDeltaMb)],
  ["heap_used_delta_mb", metrics.map((metric) => metric.heapUsedDeltaMb)],
  ["cpu_user_ms", metrics.map((metric) => metric.cpuUserMs)],
  ["cpu_system_ms", metrics.map((metric) => metric.cpuSystemMs)],
];

const summarizeGroup = (rows: readonly CsvRow[]): string => {
  const metrics = rows.map(toRunMetric);
  const runs = metrics.length;
  const successRate = safeDivide(
    metrics.filter((metric) => metric.success).length,
    runs
  );
  const rateLimitRunRate = safeDivide(
    metrics.filter((metric) => metric.has429).length,
    runs
  );
  const lines = [
    `### ${labelForGroup(rows)}`,
    "",
    `runs=${runs}, successRate=${formatNumber(successRate)}, rateLimitRunRate=${formatNumber(rateLimitRunRate)}`,
    "",
    "| Metric | Avg | Median | Min | Max | P95 | Stddev |",
    "|---|---:|---:|---:|---:|---:|---:|",
  ];

  for (const [name, values] of metricRows(metrics)) {
    lines.push(
      [
        name,
        formatNumber(average(values)),
        formatNumber(median(values)),
        formatNumber(values.length ? Math.min(...values) : 0),
        formatNumber(values.length ? Math.max(...values) : 0),
        formatNumber(percentile(values, 95)),
        formatNumber(stddev(values)),
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |")
    );
  }

  return lines.join("\n");
};

const main = () => {
  const { input, outPath } = parseArgs();
  const rows = parseCsv(readFileSync(input, "utf8"));
  const groups = new Map<string, CsvRow[]>();

  for (const row of rows) {
    const key = groupKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const output = [
    "# Job-fit Experiment Summary",
    "",
    ...[...groups.values()].map(summarizeGroup),
  ].join("\n\n");

  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${output}\n`, "utf8");
    return;
  }

  process.stdout.write(`${output}\n`);
};

main();
