import { createAdminClient } from "@/lib/supabase/server";
import { Header } from "@/components/admin/layout/header";
import { JobsSourceTabs } from "@/components/admin/jobs/jobs-source-tabs";
import { JobsTable } from "@/components/admin/jobs/jobs-table";
import { JobsAdminToolbar } from "@/components/admin/jobs/jobs-admin-toolbar";
import { JobsEmptyState } from "@/components/admin/jobs/jobs-empty-state";
import { JobsStatusSummary } from "@/components/admin/jobs/jobs-status-summary";
import { activeDeadlineOrExpression } from "@/lib/jobs/deadline";
import { getRejectedJobRetentionDays } from "@/lib/jobs/rejected-retention";
import type { Database, JobSource, JobStatus } from "@/types/database.types";
import { getCurrentUser } from "@/lib/auth/session";
import { PublicJobsView } from "@/components/admin/jobs/public-jobs-view";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

const VALID_STATUSES = ["pending", "approved", "rejected"] as const;
const VALID_SOURCES = [
  "mediajob_announcer",
  "mediajob_reporter",
  "mediajob_intern",
  "saramin",
  "jobkorea",
  "arang",
  "custom",
] as const;

const initialSourceCounts = (): Record<"all" | JobSource, number> => ({
  all: 0,
  mediajob_announcer: 0,
  mediajob_reporter: 0,
  mediajob_intern: 0,
  saramin: 0,
  jobkorea: 0,
  arang: 0,
  custom: 0,
});

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; showRejected?: string }>;
}) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const { status: rawStatus, source: rawSource, showRejected: rawShowRejected } = await searchParams;

  const supabase = createAdminClient();
  const activeDeadline = activeDeadlineOrExpression();

  // 관리자가 아닐 때 (비로그인, 수강생, 게스트 등)
  if (!isAdmin) {
    const { data: approvedJobs } = await supabase
      .from("job_postings")
      .select("*")
      .eq("status", "approved")
      .or(activeDeadline)
      .order("published_at", { ascending: false })
      .returns<JobPosting[]>();

    return (
      <PublicJobsView
        initialJobs={approvedJobs ?? []}
        isLoggedIn={!!user}
        userRole={user?.role ?? "guest"}
      />
    );
  }

  const activeStatus = VALID_STATUSES.includes(rawStatus as JobStatus)
    ? (rawStatus as JobStatus)
    : null;
  const activeSource = VALID_SOURCES.includes(rawSource as JobSource)
    ? (rawSource as JobSource)
    : null;
  const showRejected = rawShowRejected === "1";
  const hideRejectedInList = activeStatus === null && !showRejected;
  const rejectedRetentionDays = getRejectedJobRetentionDays();

  const [{ data: allForCounts }, { data: jobs, error }] = await Promise.all([
    supabase.from("job_postings").select("status, source").or(activeDeadline),
    (() => {
      let q = supabase
        .from("job_postings")
        .select("*")
        .or(activeDeadline)
        .order("created_at", { ascending: false });
      if (activeStatus) q = q.eq("status", activeStatus);
      else if (hideRejectedInList) q = q.neq("status", "rejected");
      if (activeSource) q = q.eq("source", activeSource);
      return q.returns<JobPosting[]>();
    })(),
  ]);

  const rows = allForCounts ?? [];

  const statusCounts = rows.reduce(
    (acc, r: { status: JobStatus }) => {
      acc[r.status]++;
      return acc;
    },
    { all: rows.length, pending: 0, approved: 0, rejected: 0 } as Record<"all" | JobStatus, number>,
  );

  const scopedForSource = activeStatus
    ? rows.filter((r) => r.status === activeStatus)
    : rows.filter((r) => !hideRejectedInList || r.status !== "rejected");
  const sourceCounts = scopedForSource.reduce((acc, r: { source: JobSource }) => {
    acc[r.source]++;
    return acc;
  }, { ...initialSourceCounts(), all: scopedForSource.length });

  const workQueueCount = statusCounts.pending + statusCounts.approved;

  const jobList = jobs ?? [];
  const hasJobs = jobList.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="공고 관리"
        description="미디어잡, 회사 홈페이지 등에서 수집된 공고를 관리합니다."
      />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
        <JobsStatusSummary
          statusCounts={statusCounts}
          workQueueCount={workQueueCount}
          activeSource={activeSource}
          activeStatus={activeStatus}
          showRejected={showRejected}
          rejectedRetentionDays={rejectedRetentionDays}
        />

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        )}

        {/* Actions row (above list card) */}
        <div className="flex flex-col gap-4">
          <JobsAdminToolbar />

          <JobsTable
            jobs={jobList}
            showAiRejectReasons
            sourceHeader={
              <JobsSourceTabs
                sourceCounts={sourceCounts}
                activeStatus={activeStatus}
                activeSource={activeSource}
                showRejected={showRejected}
              />
            }
            emptyState={
              hasJobs ? undefined : (
                <JobsEmptyState
                  activeStatus={activeStatus}
                  activeSource={activeSource}
                  hideRejectedInList={hideRejectedInList}
                  rejectedCount={statusCounts.rejected}
                />
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
