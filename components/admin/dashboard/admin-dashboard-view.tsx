/**
 * 관리자 대시보드 서버 뷰.
 * 등업 요청, 스터디 진행 현황, 크롤러 제어, 최근 게시 공고 데이터를 조립한다.
 */

import { Header } from "@/components/admin/layout/header";
import { activeDeadlineOrExpression, isExpiredDeadline } from "@/lib/jobs/deadline";
import { getPublicSiteOrigin } from "@/lib/jobs/site-url";
import { getAdminStudyProgress } from "@/lib/studies/admin-progress";
import { createAdminClient } from "@/lib/supabase/server";
import { CrawlerControlHub } from "./crawler-control-hub";
import {
  RecentPublishedJobsPanel,
  type RecentPublishedJob,
} from "./recent-published-jobs-panel";
import { StudyProgressDashboard } from "./study-progress-dashboard";
import {
  StudentUpgradeRequestsPanel,
  type StudentUpgradeRequestItem,
} from "./student-upgrade-requests-panel";
import {
  TodayTasksPanel,
  type TodayTaskAiPendingJob,
} from "./today-tasks-panel";
import { PullToRefreshContainer } from "@/components/ui/pull-to-refresh-container";

export async function AdminDashboardView() {
  const supabase = createAdminClient();
  const activeDeadline = activeDeadlineOrExpression();

  const [
    recentPublishedJobsResult,
    pendingUpgradeRequestsResult,
    aiPendingJobsResult,
    studyProgressResult,
  ] = await Promise.all([
    supabase
      .from("job_postings")
      .select("id,title,company,location,source,source_url,deadline,published_at")
      .eq("status", "approved")
      .not("published_at", "is", null)
      .or(activeDeadline)
      .order("published_at", { ascending: false })
      .limit(6)
      .returns<RecentPublishedJob[]>(),
    supabase
      .from("student_upgrade_requests")
      .select("id,user_id,display_name,message,requested_at")
      .eq("status", "pending")
      .order("requested_at", { ascending: true })
      .returns<
        {
          id: string;
          user_id: string;
          display_name: string | null;
          message: string;
          requested_at: string;
        }[]
      >(),
    supabase
      .from("job_postings")
      .select("id,title,company,source,created_at,ai_fit_snapshot,source_url", { count: "exact" })
      .eq("status", "pending")
      .not("ai_fit_snapshot", "is", null)
      .or(activeDeadline)
      .order("created_at", { ascending: false })
      .limit(4)
      .returns<TodayTaskAiPendingJob[]>(),
    getAdminStudyProgress(),
  ]);

  const hasJobsError = Boolean(recentPublishedJobsResult.error);
  const hasUpgradeRequestsError = Boolean(pendingUpgradeRequestsResult.error);
  const hasAiPendingJobsError = Boolean(aiPendingJobsResult.error);
  const recentPublishedJobs = (recentPublishedJobsResult.data ?? []).filter(
    (job) => !isExpiredDeadline(job.deadline),
  );
  const upgradeRequestRows = pendingUpgradeRequestsResult.data ?? [];
  const { data: upgradeProfiles } =
    upgradeRequestRows.length > 0
      ? await supabase
          .from("user_profiles")
          .select("user_id,email,display_name,real_name")
          .in(
            "user_id",
            upgradeRequestRows.map((request) => request.user_id)
          )
      : { data: [] };
  const upgradeProfilesByUserId = new Map(
    (upgradeProfiles ?? []).map((profile) => [profile.user_id, profile])
  );
  const pendingUpgradeRequests: StudentUpgradeRequestItem[] = upgradeRequestRows.map((request) => {
    const profile = upgradeProfilesByUserId.get(request.user_id);
    return {
      id: request.id,
      userId: request.user_id,
      email: profile?.email ?? null,
      displayName: request.display_name ?? profile?.real_name ?? profile?.display_name ?? null,
      message: request.message,
      requestedAt: request.requested_at,
    };
  });
  const aiPendingJobs = aiPendingJobsResult.data ?? [];
  const aiPendingJobCount = aiPendingJobsResult.count ?? aiPendingJobs.length;
  const siteOrigin = getPublicSiteOrigin();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="대시보드"
        description="Speech-M 아카데미 현황을 한눈에 확인하세요."
      />

      <PullToRefreshContainer className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:space-y-6 md:p-6">
        <TodayTasksPanel
          pendingUpgradeRequests={pendingUpgradeRequests}
          hasUpgradeRequestsError={hasUpgradeRequestsError}
          aiPendingJobs={aiPendingJobs}
          aiPendingJobCount={aiPendingJobCount}
          hasAiPendingJobsError={hasAiPendingJobsError}
        />

        {hasUpgradeRequestsError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600 md:rounded-3xl">
            수강생 등업 문의를 불러오는 중 오류가 발생했습니다.
          </div>
        ) : (
          <StudentUpgradeRequestsPanel initialRequests={pendingUpgradeRequests} />
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr] lg:gap-6">
          <StudyProgressDashboard
            progress={studyProgressResult.progress}
            hasError={studyProgressResult.hasError}
          />
          <CrawlerControlHub />
        </div>

        <RecentPublishedJobsPanel
          jobs={recentPublishedJobs}
          hasError={hasJobsError}
          siteOrigin={siteOrigin}
        />
      </PullToRefreshContainer>
    </div>
  );
}
