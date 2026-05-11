import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateBenchmarkPassFail } from "@/lib/ai/job-fit";

const metricsSchema = z.object({
  precision: z.number(),
  recall: z.number(),
  f1: z.number(),
  driftDelta: z.number(),
});

/**
 * 배치/외부 스크립트에서 golden-set 메트릭을 넣어 pass/fail을 받기 위한 진단 엔드포인트.
 * 크롤 API와 동일하게 `CRAWL_API_SECRET` + `x-crawl-secret` 헤더로 보호한다.
 */
export async function POST(request: Request) {
  const secret = process.env.CRAWL_API_SECRET;
  const provided = request.headers.get("x-crawl-secret");
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = metricsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = evaluateBenchmarkPassFail(parsed.data);
  return NextResponse.json(result);
}
