/**
 * crawl/all 완료 후 after() kick으로 호출: 리스트형 소스의 마감 지난 공고를 DB에서 정리한다.
 * 인증: `Authorization: Bearer ${CRON_SECRET}` (일일 전체 크롤과 동일).
 */
import { NextResponse } from "next/server";
import { purgeRejectedPastRetention } from "@/lib/jobs/purge-rejected-ttl";
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

  const staleListing = await runStaleListingPurge();
  const rejectedTtl = await purgeRejectedPastRetention();

  if (!staleListing.success) {
    return NextResponse.json(
      {
        error: staleListing.error ?? "Stale listing purge failed",
        staleListing,
        rejectedTtl,
      },
      { status: 500 }
    );
  }
  if (!rejectedTtl.success) {
    return NextResponse.json(
      {
        error: rejectedTtl.error ?? "Rejected TTL purge failed",
        staleListing,
        rejectedTtl,
      },
      { status: 500 }
    );
  }

  const body = { staleListing, rejectedTtl };
  console.info("[cron/purge-stale-job-postings]", body);
  return NextResponse.json(body);
}

export async function POST(request: Request) {
  return GET(request);
}
