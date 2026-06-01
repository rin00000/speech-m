/**
 * 관리자 화면에서 job-fit 배치를 백그라운드로 시작하는 라우트.
 * 응답은 즉시 반환하고 실제 LLM 판별은 after()에서 처리해 UI 작업을 막지 않는다.
 */

import { revalidatePath } from "next/cache";
import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { runJobFitBatch } from "@/lib/ai/job-fit";

export const maxDuration = 300;

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    const startedAt = Date.now();
    const result = await runJobFitBatch(30);
    revalidatePath("/jobs");
    revalidatePath("/dashboard");
    console.info("[admin/job-fit/run]", {
      durationMs: Date.now() - startedAt,
      result,
    });
  });

  return NextResponse.json({ success: true, queued: true }, { status: 202 });
}
