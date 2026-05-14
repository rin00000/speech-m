import { NextResponse } from "next/server";
import { CRAWL_SOURCES, triggerCrawl } from "@/lib/crawl/trigger";

type Summary = {
  success: boolean;
  totalSaved: number;
  totalInserted: number;
  totalParsed: number;
  durationMs: number;
};

const buildBaseUrl = (request: Request) => new URL(request.url).origin;

const verifyCronRequest = (request: Request): boolean => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || !authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
};

const runAllSources = async (request: Request) => {
  const crawlSecret = process.env.CRAWL_API_SECRET;
  if (!crawlSecret) {
    return NextResponse.json(
      { error: "CRAWL_API_SECRET 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const startedAt = Date.now();
  const baseUrl = buildBaseUrl(request);
  const results = [];

  for (const source of CRAWL_SOURCES) {
    const result = await triggerCrawl(source, { baseUrl, secret: crawlSecret });
    results.push(result);
  }

  const summary: Summary = {
    success: results.every((result) => result.success),
    totalSaved: results.reduce((acc, result) => acc + (result.saved ?? 0), 0),
    totalInserted: results.reduce((acc, result) => acc + (result.inserted ?? 0), 0),
    totalParsed: results.reduce((acc, result) => acc + (result.total ?? 0), 0),
    durationMs: Date.now() - startedAt,
  };

  console.info("[crawl/all]", {
    summary,
    results,
  });

  const status = summary.success ? 200 : 207;
  return NextResponse.json({ summary, results }, { status });
};

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  return runAllSources(request);
}

export async function POST(request: Request) {
  return runAllSources(request);
}
