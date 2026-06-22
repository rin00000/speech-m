"use server";

/**
 * /jobs 라우트에서 공개하는 공고 관리 Server Actions.
 * 크롤 실행, AI fit 배치, 수동 공고, 검수 상태 변경, 내부 게시 처리를 담당한다.
 */

import { headers } from "next/headers";
import { addBlockedSourceUrls } from "@/lib/crawl/blocked-source-urls";
import { createAdminClient } from "@/lib/supabase/server";
import { triggerCrawl, type CrawlSource } from "@/lib/crawl/trigger";
import {
  evaluateBenchmarkPassFail,
  runJobFitBatch,
  type BenchmarkMetrics,
  type BenchmarkResult,
} from "@/lib/ai/job-fit";
import { buildJobPostDraftPrompt } from "@/lib/ai/post/prompt";
import { isDeadlineActiveForDedup } from "@/lib/crawl/fingerprint";
import {
  getAdminAuthCheck,
  getAuthCheckErrorMessage,
  getAuthCheckFailureCode,
} from "@/lib/auth/session";
import {
  buildManualJobPostingPayload,
  type ManualJobPostingInput,
} from "@/lib/jobs/manual-job-posting";
import type { JobStatus } from "@/types/database.types";
import {
  DELETE_REJECTED_CHUNK,
  revalidateJobsViews,
  statusUpdatePayload,
  type CreateManualJobPostingResult,
  type DuplicateFingerprintRow,
  type JobPostDraftPromptResult,
  type MarkPublishedResult,
  type RunAiFitResult,
  type RunCrawlResult,
} from "./_actions/jobs-action-helpers";

async function getJobsAdminError() {
  const auth = await getAdminAuthCheck();
  if (auth.status === "authenticated") return null;
  return {
    authStatus: getAuthCheckFailureCode(auth),
    error: getAuthCheckErrorMessage(auth),
  };
}

async function requireJobsAdminOrThrow() {
  const failure = await getJobsAdminError();
  if (failure) throw new Error(failure.error);
}

export type { CrawlSource } from "@/lib/crawl/trigger";
export type {
  CreateManualJobPostingResult,
  JobPostDraftPromptResult,
  MarkPublishedResult,
  RunAiFitResult,
  RunCrawlResult,
} from "./_actions/jobs-action-helpers";

/** 서버 액션에서 즉시 판정. 외부 배치·curl은 `POST /api/admin/benchmark-job-fit`(동일 `x-crawl-secret`) 사용. */
export const evaluateAiFilterBenchmark = async (metrics: BenchmarkMetrics): Promise<BenchmarkResult> =>
  evaluateBenchmarkPassFail(metrics);

export const runCrawl = async (source: CrawlSource): Promise<RunCrawlResult> => {
  const authError = await getJobsAdminError();
  if (authError) return { success: false, ...authError };

  const secret = process.env.CRAWL_API_SECRET;
  if (!secret) {
    return { success: false, error: "CRAWL_API_SECRET 환경변수가 설정되지 않았습니다." };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return { success: false, error: "요청 호스트를 확인할 수 없습니다." };
  }

  try {
    const result = await triggerCrawl(source, {
      baseUrl: `${proto}://${host}`,
      secret,
    });

    if (!result.success) {
      return { success: false, error: result.error ?? "크롤링 실패" };
    }

    revalidateJobsViews();
    return {
      success: true,
      saved: result.saved ?? 0,
      inserted: result.inserted ?? 0,
      updated: result.updated ?? 0,
      total: result.total ?? 0,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const runAiFitBatch = async (): Promise<RunAiFitResult> => {
  const authError = await getJobsAdminError();
  if (authError) return { success: false, ...authError };

  try {
    const result = await runJobFitBatch(30);
    revalidateJobsViews();
    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

export const createManualJobPosting = async (
  input: ManualJobPostingInput
): Promise<CreateManualJobPostingResult> => {
  const authError = await getJobsAdminError();
  if (authError) return { success: false, ...authError };

  const built = buildManualJobPostingPayload(input);
  if (!built.success) {
    return {
      success: false,
      error: built.error,
      fieldErrors: built.fieldErrors,
    };
  }

  const supabase = createAdminClient();
  const { payload } = built;

  const { data: existingByUrl, error: urlLookupError } = await supabase
    .from("job_postings")
    .select("id")
    .eq("source_url", payload.source_url)
    .maybeSingle();

  if (urlLookupError) {
    console.error("createManualJobPosting URL lookup error:", urlLookupError);
    return { success: false, error: "기존 공고 확인 중 오류가 발생했습니다." };
  }
  if (existingByUrl) {
    return {
      success: false,
      error: "이미 등록된 원문 URL입니다.",
      fieldErrors: { sourceUrl: "이미 등록된 원문 URL입니다." },
    };
  }

  if (payload.fingerprint) {
    const { data: fingerprintRows, error: fingerprintLookupError } = await supabase
      .from("job_postings")
      .select("id,deadline,status")
      .eq("fingerprint", payload.fingerprint)
      .in("status", ["pending", "approved"])
      .returns<DuplicateFingerprintRow[]>();

    if (fingerprintLookupError) {
      console.error("createManualJobPosting fingerprint lookup error:", fingerprintLookupError);
      return { success: false, error: "중복 공고 확인 중 오류가 발생했습니다." };
    }

    const hasActiveDuplicate = (fingerprintRows ?? []).some((row) =>
      isDeadlineActiveForDedup(row.deadline)
    );
    if (hasActiveDuplicate) {
      return {
        success: false,
        error: "같은 회사명과 공고명으로 등록된 활성 공고가 있습니다.",
        fieldErrors: {
          title: "같은 회사명과 공고명으로 등록된 활성 공고가 있습니다.",
        },
      };
    }
  }

  const { data, error } = await supabase.from("job_postings").insert(payload).select("id");

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "이미 등록된 원문 URL입니다.",
        fieldErrors: { sourceUrl: "이미 등록된 원문 URL입니다." },
      };
    }
    console.error("createManualJobPosting insert error:", error);
    return { success: false, error: "수동 공고 저장 중 오류가 발생했습니다." };
  }

  revalidateJobsViews();
  return { success: true, id: data?.[0]?.id };
};

/**
 * HITL: pending = human/AI 미확정, approved/rejected = 검수 확정.
 * 검수 상태가 approved가 아니면 내부 게시 시각(`published_at`)을 비운다.
 * rejected로 확정될 때 `rejected_at`을 채우고, 그 외로 되돌리면 null로 둔다.
 */
export const updateJobStatus = async (id: string, status: JobStatus) => {
  await requireJobsAdminOrThrow();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_postings")
    .update(statusUpdatePayload(status))
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateJobsViews();
};

export const bulkUpdateJobStatus = async (ids: string[], status: JobStatus) => {
  await requireJobsAdminOrThrow();

  if (!ids.length) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_postings")
    .update(statusUpdatePayload(status))
    .in("id", ids);

  if (error) throw new Error(error.message);
  revalidateJobsViews();
};

/**
 * `status === "rejected"`인 행만 하드 삭제한다. id 목록에 다른 상태가 섞여 있어도 DB 조건으로 제외된다.
 */
export const deleteRejectedJobPostings = async (ids: string[]): Promise<void> => {
  await requireJobsAdminOrThrow();

  if (!ids.length) return;
  const supabase = createAdminClient();
  for (let i = 0; i < ids.length; i += DELETE_REJECTED_CHUNK) {
    const chunk = ids.slice(i, i + DELETE_REJECTED_CHUNK);
    const { data: rows, error: selErr } = await supabase
      .from("job_postings")
      .select("source_url")
      .in("id", chunk)
      .eq("status", "rejected")
      .returns<{ source_url: string }[]>();
    if (selErr) throw new Error(selErr.message);
    const urls = (rows ?? []).map((r) => r.source_url).filter(Boolean);
    if (urls.length) {
      await addBlockedSourceUrls(urls, { reason: "manual_delete" });
    }
    const { error } = await supabase.from("job_postings").delete().in("id", chunk).eq("status", "rejected");
    if (error) throw new Error(error.message);
  }
  revalidateJobsViews();
};

/** 승인된 공고만 내부 게시 처리: `published_at`에 내부 게시 시각을 최초 1회 설정(idempotent). */
export const markJobsPublished = async (ids: string[]): Promise<MarkPublishedResult> => {
  const authError = await getJobsAdminError();
  if (authError) return { success: false, ...authError };

  if (!ids.length) return { success: true, updated: 0 };
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: rows, error: fetchError } = await supabase
    .from("job_postings")
    .select("id,status,published_at")
    .in("id", ids)
    .eq("status", "approved")
    .is("published_at", null)
    .returns<{ id: string }[]>();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const eligible = rows ?? [];
  if (eligible.length === 0) {
    return { success: true, updated: 0 };
  }

  const { error } = await supabase
    .from("job_postings")
    .update({ published_at: now })
    .in(
      "id",
      eligible.map((r) => r.id)
    );

  if (error) {
    return { success: false, error: error.message };
  }
  revalidateJobsViews();
  return { success: true, updated: eligible.length };
};

/** 승인·내부 게시 확정 공고만: 외부 LLM에 붙일 초안용 한국어 프롬프트 문자열을 반환한다. */
export const getJobPostDraftPrompt = async (id: string): Promise<JobPostDraftPromptResult> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("job_postings")
    .select("id,title,company,location,deadline,source,source_url,status,published_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: "공고를 찾을 수 없습니다." };
  }
  if (data.status !== "approved" || !data.published_at) {
    return { success: false, error: "승인되고 내부 게시가 확정된 공고만 사용할 수 있습니다." };
  }

  return {
    success: true,
    prompt: buildJobPostDraftPrompt(data),
  };
};
