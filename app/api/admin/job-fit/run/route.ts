/**
 * 관리자 화면에서 job-fit 배치를 백그라운드로 시작하는 라우트.
 * 응답은 즉시 반환하고 실제 LLM 판별은 after()에서 처리해 UI 작업을 막지 않는다.
 */

import { revalidatePath } from "next/cache";
import { after, NextResponse } from "next/server";
import {
  getAdminAuthCheck,
  getAuthCheckErrorMessage,
  getAuthCheckHttpStatus,
} from "@/lib/auth/session";
import { runJobFitBatch } from "@/lib/ai/job-fit";
import { ADMIN_JOB_FIT_BATCH_LIMIT } from "@/lib/ai/job-fit/constants";
import { acquireAdminJobFitRunLock } from "@/lib/ai/job-fit/pipeline/admin-run-lock";

export const maxDuration = 300;

export async function POST() {
  const auth = await getAdminAuthCheck();
  if (auth.status !== "authenticated") {
    return NextResponse.json(
      { success: false, error: getAuthCheckErrorMessage(auth) },
      { status: getAuthCheckHttpStatus(auth) }
    );
  }

  const lock = await acquireAdminJobFitRunLock();
  const lockAcquiredAtMs = Date.now();
  if (!lock.acquired) {
    return NextResponse.json(
      { success: true, started: false, alreadyRunning: true },
      { status: 202 }
    );
  }

  after(async () => {
    const startedAt = Date.now();
    try {
      const result = await runJobFitBatch(ADMIN_JOB_FIT_BATCH_LIMIT, {
        experimentAllowed: true,
        lockAcquiredAtMs,
      });
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
      await lock.release();
    }
  });

  return NextResponse.json(
    { success: true, started: true, alreadyRunning: false },
    { status: 202 }
  );
}
