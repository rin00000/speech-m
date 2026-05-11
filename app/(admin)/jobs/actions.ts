"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import {
  evaluateBenchmarkPassFail,
  type BenchmarkMetrics,
  type BenchmarkResult,
} from "@/lib/ai/job-fit/benchmark";
import type { JobStatus } from "@/types/database.types";

export type CrawlSource = "mediajob" | "saramin" | "jobkorea";

const ALLOWED_CRAWL_SOURCES: readonly CrawlSource[] = [
  "mediajob",
  "saramin",
  "jobkorea",
] as const;

export type RunCrawlResult = {
  success: boolean;
  saved?: number;
  total?: number;
  error?: string;
};

/** 서버 액션에서 즉시 판정. 외부 배치·curl은 `POST /api/admin/benchmark-job-fit`(동일 `x-crawl-secret`) 사용. */
export const evaluateAiFilterBenchmark = async (
  metrics: BenchmarkMetrics
): Promise<BenchmarkResult> => {
  return evaluateBenchmarkPassFail(metrics);
};

export const runCrawl = async (source: CrawlSource): Promise<RunCrawlResult> => {
  if (!ALLOWED_CRAWL_SOURCES.includes(source)) {
    return { success: false, error: "허용되지 않는 소스입니다." };
  }

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
    const res = await fetch(`${proto}://${host}/api/crawl/${source}`, {
      method: "POST",
      headers: { "x-crawl-secret": secret },
      cache: "no-store",
    });

    const json = (await res.json()) as {
      saved?: number;
      total?: number;
      error?: string;
    };

    if (!res.ok || json.error) {
      return { success: false, error: json.error ?? `HTTP ${res.status}` };
    }

    revalidatePath("/jobs");
    return { success: true, saved: json.saved ?? 0, total: json.total ?? 0 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
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
