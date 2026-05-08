"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { triggerCrawl, type CrawlSource } from "@/lib/crawl/trigger";
import { runJobFitBatch } from "@/lib/ai/job-fit/batch";
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

export const updateJobStatus = async (id: string, status: JobStatus) => {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_postings")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
};

export const bulkUpdateJobStatus = async (ids: string[], status: JobStatus) => {
  if (!ids.length) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_postings")
    .update({ status })
    .in("id", ids);

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
};
