/**
 * 공고 관리 Server Action에서 공유하는 결과 타입과 상태 업데이트 helper.
 * 액션 파일이 외부 호출 흐름과 DB mutation 본문에 집중하도록 보조 로직을 분리한다.
 */

import { revalidatePath } from "next/cache";
import type { ManualJobPostingFieldErrors } from "@/lib/jobs/manual-job-posting";
import type { JobStatus } from "@/types/database.types";

/** 공고 데이터 변경 시 공고 관리·대시보드(같은 DB를 읽는 모든 관리자 화면)를 함께 갱신. */
export const revalidateJobsViews = () => {
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
};

export type RunCrawlResult = {
  success: boolean;
  saved?: number;
  inserted?: number;
  updated?: number;
  total?: number;
  error?: string;
};

export type RunAiFitResult = {
  success: boolean;
  scanned?: number;
  approved?: number;
  rejected?: number;
  pending?: number;
  failed?: number;
  error?: string;
};

export type CreateManualJobPostingResult =
  | { success: true; id?: string }
  | { success: false; error: string; fieldErrors?: ManualJobPostingFieldErrors };

export type DuplicateFingerprintRow = {
  id: string;
  deadline: string | null;
  status: JobStatus;
};

const nowIso = () => new Date().toISOString();

export const statusUpdatePayload = (status: JobStatus) => {
  const clearAiSnapshot = { ai_fit_snapshot: null };
  if (status === "approved") {
    return { status, rejected_at: null, ...clearAiSnapshot };
  }
  if (status === "rejected") {
    return { status, published_at: null, rejected_at: nowIso(), ...clearAiSnapshot };
  }
  return { status, published_at: null, rejected_at: null, ...clearAiSnapshot };
};

export const DELETE_REJECTED_CHUNK = 200;

export type MarkPublishedResult = {
  success: boolean;
  updated?: number;
  error?: string;
};

export type JobPostDraftPromptResult =
  | { success: true; prompt: string }
  | { success: false; error: string };
