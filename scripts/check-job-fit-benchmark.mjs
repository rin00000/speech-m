/**
 * POST deployed metrics JSON to /api/admin/benchmark-job-fit and exit non-zero if !passed.
 *
 * Env:
 *   BENCHMARK_BASE_URL — e.g. https://your-app.example.com (no trailing slash required)
 *   CRAWL_API_SECRET   — same as crawl proxy / API
 * Optional:
 *   JOB_FIT_METRICS_PATH — path to JSON (default: data/job-fit/golden-metrics.sample.json)
 */
import { readFile } from "node:fs/promises";

const baseRaw = process.env.BENCHMARK_BASE_URL?.trim();
const secret = process.env.CRAWL_API_SECRET?.trim();
const metricsPath =
  process.env.JOB_FIT_METRICS_PATH?.trim() ||
  "data/job-fit/golden-metrics.sample.json";

if (!baseRaw || !secret) {
  console.error(
    "Missing env: BENCHMARK_BASE_URL and CRAWL_API_SECRET are required."
  );
  process.exit(1);
}

const base = baseRaw.replace(/\/+$/, "");

let body;
try {
  const raw = await readFile(metricsPath, "utf8");
  body = JSON.parse(raw);
} catch (e) {
  console.error(`Failed to read metrics file ${metricsPath}:`, e);
  process.exit(1);
}

const url = `${base}/api/admin/benchmark-job-fit`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-crawl-secret": secret,
  },
  body: JSON.stringify(body),
});

let json;
try {
  json = await res.json();
} catch {
  console.error("Response was not JSON", res.status);
  process.exit(1);
}

if (!res.ok) {
  console.error("HTTP", res.status, json);
  process.exit(1);
}

console.log(JSON.stringify(json, null, 2));

if (!json.passed) {
  console.error("Benchmark failed:", json.failedChecks);
  process.exit(1);
}
