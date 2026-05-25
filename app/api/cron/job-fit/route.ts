/**
 * Vercel Cron: pending 공고 LLM 일괄 판별.
 * 인증: `Authorization: Bearer ${CRON_SECRET}` (일일 크롤과 동일).
 */
import { NextResponse } from "next/server";
import { runJobFitBatch } from "@/lib/ai/job-fit";
import { getJobFitCronBatchLimit } from "@/lib/cron/job-fit-batch-limit";

export const maxDuration = 300;

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

  const limit = getJobFitCronBatchLimit();
  const jobFit = await runJobFitBatch(limit);

  console.info("[cron/job-fit]", { limit, jobFit });

  if (!jobFit.success) {
    return NextResponse.json(
      { error: jobFit.error ?? "Job-fit batch failed", limit, jobFit },
      { status: 500 }
    );
  }

  return NextResponse.json({ limit, jobFit });
}

export async function POST(request: Request) {
  return GET(request);
}
