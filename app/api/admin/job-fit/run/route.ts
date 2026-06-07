/**
 * 관리자 화면에서 job-fit 배치를 백그라운드로 시작하는 라우트.
 * 응답은 즉시 반환하고 실제 LLM 판별은 after()에서 처리해 UI 작업을 막지 않는다.
 */

import { revalidatePath } from "next/cache";
import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { runJobFitBatch } from "@/lib/ai/job-fit";

export const maxDuration = 300;

const ADMIN_JOB_FIT_BATCH_LIMIT = 30;
let adminJobFitRunInProgress = false;

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (adminJobFitRunInProgress) {
    return NextResponse.json(
      { success: true, queued: true, alreadyRunning: true },
      { status: 202 }
    );
  }

  adminJobFitRunInProgress = true;

  after(async () => {
    const startedAt = Date.now();
    try {
      const result = await runJobFitBatch(ADMIN_JOB_FIT_BATCH_LIMIT);
      revalidatePath("/jobs");
      revalidatePath("/dashboard");
      console.info("[admin/job-fit/run]", {
        durationMs: Date.now() - startedAt,
        limit: ADMIN_JOB_FIT_BATCH_LIMIT,
        result,
      });
    } catch (error) {
      console.error("[admin/job-fit/run] failed", {
        durationMs: Date.now() - startedAt,
        limit: ADMIN_JOB_FIT_BATCH_LIMIT,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      adminJobFitRunInProgress = false;
    }
  });

  return NextResponse.json({ success: true, queued: true }, { status: 202 });
}
