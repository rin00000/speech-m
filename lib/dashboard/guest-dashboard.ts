/**
 * 게스트 대시보드에 필요한 공고 통계와 등업 요청 상태를 조회하는 로더입니다.
 * 재사용 UI 컴포넌트가 서비스 롤 Supabase 클라이언트를 직접 다루지 않도록 데이터 책임을 분리합니다.
 */

import { activeDeadlineOrExpression } from "@/lib/jobs/deadline";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

export type GuestDashboardJob = Pick<
  JobPosting,
  "id" | "title" | "company" | "deadline" | "source_url" | "published_at"
>;

export type GuestDashboardPendingUpgradeRequest = {
  message: string;
  requested_at: string;
} | null;

export type GuestDashboardData = {
  totalCount: number;
  recentWeekCount: number;
  recentJobs: GuestDashboardJob[];
  pendingUpgradeRequest: GuestDashboardPendingUpgradeRequest;
};

export async function getGuestDashboardData({
  userId,
  isLoggedIn,
}: {
  userId: string | null;
  isLoggedIn: boolean;
}): Promise<GuestDashboardData> {
  const supabase = createAdminClient();
  const activeDeadline = activeDeadlineOrExpression();
  const recentWeekIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalCount },
    { count: recentWeekCount },
    { data: recentJobs },
    upgradeResult,
  ] = await Promise.all([
    supabase
      .from("job_postings")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .or(activeDeadline),
    supabase
      .from("job_postings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .or(activeDeadline)
      .gte("published_at", recentWeekIso),
    supabase
      .from("job_postings")
      .select("id,title,company,deadline,source_url,published_at")
      .eq("status", "approved")
      .or(activeDeadline)
      .order("published_at", { ascending: false })
      .limit(5)
      .returns<GuestDashboardJob[]>(),
    isLoggedIn && userId
      ? supabase
          .from("student_upgrade_requests")
          .select("message,requested_at")
          .eq("user_id", userId)
          .eq("status", "pending")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    totalCount: totalCount ?? 0,
    recentWeekCount: recentWeekCount ?? 0,
    recentJobs: recentJobs ?? [],
    pendingUpgradeRequest: upgradeResult.data ?? null,
  };
}
