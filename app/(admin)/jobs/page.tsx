import { createAdminClient } from "@/lib/supabase/server";
import { Header } from "@/components/admin/layout/header";
import { JobsSourceTabs } from "@/components/admin/jobs/jobs-source-tabs";
import { JobsTable } from "@/components/admin/jobs/jobs-table";
import { JobsAdminToolbar } from "@/components/admin/jobs/jobs-admin-toolbar";
import { JobsEmptyState } from "@/components/admin/jobs/jobs-empty-state";
import { JobsStatusSummary } from "@/components/admin/jobs/jobs-status-summary";
import { PullToRefreshContainer } from "@/components/ui/pull-to-refresh-container";
import { getRejectedJobRetentionDays } from "@/lib/jobs/rejected-retention";
import { getCurrentUser } from "@/lib/auth/session";
import { PublicJobsView } from "@/components/admin/jobs/public-jobs-view";
import {
  getAdminJobsListData,
  getPublicJobsListData,
  parseJobsListParams,
  type JobsListSearchParams,
} from "@/lib/jobs/listing-data";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<JobsListSearchParams>;
}) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const params = parseJobsListParams(await searchParams);
  const supabase = createAdminClient();

  if (!isAdmin) {
    const publicJobs = await getPublicJobsListData({ supabase, params });

    return (
      <PublicJobsView
        initialJobs={publicJobs.jobs}
        isLoggedIn={!!user}
        userRole={user?.role ?? "guest"}
        query={params.query}
        pagination={publicJobs.pagination}
      />
    );
  }

  const rejectedRetentionDays = getRejectedJobRetentionDays();
  const jobsData = await getAdminJobsListData({ supabase, params });
  const hasJobs = jobsData.jobs.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="怨듦퀬 愿由?"
        description="誘몃뵒?댁옟, ?뚯궗 ?덊럹?댁? ?깆뿉???섏쭛??怨듦퀬瑜?愿由ы빀?덈떎."
      />

      <PullToRefreshContainer className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
        <JobsStatusSummary
          statusCounts={jobsData.statusCounts}
          workQueueCount={jobsData.workQueueCount}
          activeSource={params.activeSource}
          activeStatus={params.activeStatus}
          showRejected={params.showRejected}
          rejectedRetentionDays={rejectedRetentionDays}
          query={params.query}
        />

        <div className="flex flex-col gap-4">
          <JobsAdminToolbar />

          <JobsTable
            jobs={jobsData.jobs}
            query={params.query}
            pagination={jobsData.pagination}
            showAiRejectReasons
            sourceHeader={
              <JobsSourceTabs
                sourceCounts={jobsData.sourceCounts}
                activeStatus={params.activeStatus}
                activeSource={params.activeSource}
                showRejected={params.showRejected}
                query={params.query}
              />
            }
            emptyState={
              hasJobs ? undefined : (
                <JobsEmptyState
                  activeStatus={params.activeStatus}
                  activeSource={params.activeSource}
                  hideRejectedInList={params.hideRejectedInList}
                  rejectedCount={jobsData.statusCounts.rejected}
                  query={params.query}
                />
              )
            }
          />
        </div>
      </PullToRefreshContainer>
    </div>
  );
}
