/**
 * Vercel Cron 등에서 호출: 리스트형 소스의 마감 지난 공고를 DB에서 정리한다.
 * 인증은 일일 전체 크롤(`/api/crawl/all`)과 동일하게 `Authorization: Bearer ${CRON_SECRET}`.
 */
import { NextResponse } from "next/server";
import { runStaleListingPurge } from "@/lib/jobs/purge-stale-listings";

const verifyCronRequest = (request: Request): boolean => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
};

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  const result = await runStaleListingPurge();
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Purge failed", cutoffIso: result.cutoffIso, deleted: result.deleted },
      { status: 500 }
    );
  }

  console.info("[cron/purge-stale-job-postings]", result);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
