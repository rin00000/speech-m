"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { triggerCrawl, type CrawlSource } from "@/lib/crawl/trigger";
import {
  evaluateBenchmarkPassFail,
  runJobFitBatch,
  type BenchmarkMetrics,
  type BenchmarkResult,
} from "@/lib/ai/job-fit";
import type { JobStatus } from "@/types/database.types";
export type { CrawlSource } from "@/lib/crawl/trigger";

export type RunCrawlResult = {
  success: boolean;
  saved?: number;
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

/** 서버 액션에서 즉시 판정. 외부 배치·curl은 `POST /api/admin/benchmark-job-fit`(동일 `x-crawl-secret`) 사용. */
export const evaluateAiFilterBenchmark = async (
  metrics: BenchmarkMetrics
): Promise<BenchmarkResult> => {
  return evaluateBenchmarkPassFail(metrics);
};

export const runCrawl = async (source: CrawlSource): Promise<RunCrawlResult> => {
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

    revalidatePath("/jobs");
    return { success: true, saved: result.saved ?? 0, total: result.total ?? 0 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const runAiFitBatch = async (): Promise<RunAiFitResult> => {
  try {
    const result = await runJobFitBatch(30);
    revalidatePath("/jobs");
    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

/**
 * HITL: pending = human/AI 미확정, approved/rejected = 검수 확정.
 * 검수 상태가 approved가 아니면 내부 게시 시각(`published_at`)을 비운다.
 * rejected로 확정될 때 `rejected_at`을 채우고, 그 외로 되돌리면 null로 둔다.
 */
const nowIso = () => new Date().toISOString();

const statusUpdatePayload = (status: JobStatus) => {
  if (status === "approved") {
    return { status, rejected_at: null } as const;
  }
  if (status === "rejected") {
    return { status, published_at: null, rejected_at: nowIso() } as const;
  }
  return { status, published_at: null, rejected_at: null } as const;
};

export const updateJobStatus = async (id: string, status: JobStatus) => {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_postings")
    .update(statusUpdatePayload(status))
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
};

export const bulkUpdateJobStatus = async (ids: string[], status: JobStatus) => {
  if (!ids.length) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_postings")
    .update(statusUpdatePayload(status))
    .in("id", ids);

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
};

export type MarkPublishedResult = {
  success: boolean;
  updated?: number;
  error?: string;
};

/** 승인된 공고만 내부 게시 처리: `published_at`에 내부 게시 시각을 최초 1회 설정(idempotent). */
export const markJobsPublished = async (ids: string[]): Promise<MarkPublishedResult> => {
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
  revalidatePath("/jobs");
  return { success: true, updated: eligible.length };
};
