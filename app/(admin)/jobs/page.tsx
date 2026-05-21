import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Header } from "@/components/admin/layout/header";
import { CrawlButton } from "@/components/admin/crawl/crawl-button";
import { AiFitButton } from "@/components/admin/ai/ai-fit-button";
import { JobsSourceTabs } from "@/components/admin/jobs/jobs-source-tabs";
import { JobsTable } from "@/components/admin/jobs/jobs-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Clock01Icon,
  GridViewIcon,
} from "@hugeicons/core-free-icons";
import { buildJobsAdminHref } from "@/lib/jobs/jobs-admin-urls";
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

  // 관리자가 아닐 때 (비로그인, 수강생, 게스트 등)
  if (!isAdmin) {
    const { data: approvedJobs } = await supabase
      .from("job_postings")
      .select("*")
      .eq("status", "approved")
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
    supabase.from("job_postings").select("status, source"),
    (() => {
      let q = supabase
        .from("job_postings")
        .select("*")
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

  const statCards: {
    label: string;
    value: number;
    icon: typeof GridViewIcon;
    accent: string;
    bar: string;
    status: JobStatus | null;
    href: string;
    scope: "work" | "all";
  }[] = [
    {
      label: showRejected ? "전체" : "작업 대상",
      value: showRejected ? statusCounts.all : workQueueCount,
      icon: GridViewIcon,
      accent: "text-gray-600 bg-gray-100",
      bar: "bg-gray-400",
      status: null,
      href: buildJobsAdminHref({
        source: activeSource,
        showRejected: showRejected ? true : undefined,
      }),
      scope: showRejected ? "all" : "work",
    },
    {
      label: "검토 중",
      value: statusCounts.pending,
      icon: Clock01Icon,
      accent: "text-amber-600 bg-amber-50",
      bar: "bg-amber-400",
      status: "pending",
      href: buildJobsAdminHref({ status: "pending", source: activeSource }),
      scope: "work",
    },
    {
      label: "승인됨",
      value: statusCounts.approved,
      icon: CheckmarkCircle01Icon,
      accent: "text-emerald-600 bg-emerald-50",
      bar: "bg-emerald-500",
      status: "approved",
      href: buildJobsAdminHref({ status: "approved", source: activeSource }),
      scope: "work",
    },
    {
      label: "거절됨",
      value: statusCounts.rejected,
      icon: Cancel01Icon,
      accent: "text-red-500 bg-red-50",
      bar: "bg-red-400",
      status: "rejected",
      href: buildJobsAdminHref({ status: "rejected", source: activeSource }),
      scope: "work",
    },
  ];

  const jobList = jobs ?? [];
  const hasJobs = jobList.length > 0;

  return (
    <div className="flex flex-col">
      <Header
        title="공고 관리"
        description="미디어잡, 회사 홈페이지 등에서 수집된 공고를 관리합니다."
      />

        <div className="flex-1 space-y-3 p-6">
        {/* Stats cards + rejected visibility hint (state tabs removed; cards are the primary control) */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map(({ label, value, icon, accent, bar, status: cardStatus, href, scope }) => {
              const isActive =
                cardStatus === null
                  ? activeStatus === null && (scope === "all" ? showRejected : !showRejected)
                  : activeStatus === cardStatus;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`relative block overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-sm ${
                    isActive ? "border-periwinkle-600 ring-1 ring-periwinkle-600" : "border-gray-200"
                  }`}
                >
                  <div className={`absolute left-0 top-0 h-full w-1 ${bar} rounded-l-xl`} />
                  <div className="flex items-center justify-between pl-2">
                    <div>
                      <p className="text-xs font-medium leading-tight text-gray-500">{label}</p>
                      <p className="mt-1 text-2xl font-extrabold leading-[1.1] tabular-nums text-gray-900">{value}</p>
                    </div>
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 ${accent}`}>
                      <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.8} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          {!showRejected && statusCounts.rejected > 0 ? (
            <p className="text-[11px] leading-tight text-gray-500">
              거절 {statusCounts.rejected}건은 기본에서 숨깁니다.{" "}
              <Link
                href={buildJobsAdminHref({ source: activeSource, showRejected: true })}
                className="font-medium text-periwinkle-700 underline-offset-2 hover:underline"
              >
                DB 전체 보기
              </Link>
            </p>
          ) : showRejected ? (
            <p className="text-[11px] leading-tight text-gray-500">
              <Link
                href={buildJobsAdminHref({ source: activeSource })}
                className="font-medium text-periwinkle-700 underline-offset-2 hover:underline"
              >
                작업 대상만(거절 숨김)
              </Link>
            </p>
          ) : null}
          <p className="text-[11px] leading-snug text-gray-400">
            거절 공고는 거절 확정 시각 기준 {rejectedRetentionDays}일이 지나면 정리 크론 실행 시 DB에서
            자동 삭제됩니다. 수동 삭제와 동일하게 해당 URL은 다시 수집되지 않습니다.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        )}

        {/* Actions row (above list card) */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CrawlButton source="mediajob" label="미디어잡 즉시 동기화" />
            <CrawlButton source="saramin" label="사람인 즉시 동기화" />
            <CrawlButton source="jobkorea" label="잡코리아 즉시 동기화" />
            <AiFitButton />
          </div>

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
              <div className="px-4 py-16 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400">
                  <HugeiconsIcon
                    icon={Briefcase01Icon}
                    size={28}
                    color="currentColor"
                    strokeWidth={1.5}
                  />
                </span>
                <p className="mt-4 text-sm font-medium text-gray-600">
                  {hideRejectedInList && statusCounts.rejected > 0
                    ? "보류·승인 공고가 없습니다. 거절만 있는 경우 아래에서 거절 목록을 여세요."
                    : activeStatus || activeSource
                      ? "해당 조건의 공고가 없습니다"
                      : "등록된 공고가 없습니다"}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {hideRejectedInList && statusCounts.rejected > 0 ? (
                    <>
                      거절 {statusCounts.rejected}건은 기본 목록에서 숨깁니다.{" "}
                      <a
                        className="font-medium text-periwinkle-700 underline-offset-2 hover:underline"
                        href={buildJobsAdminHref({ source: activeSource, showRejected: true })}
                      >
                        거절 포함해 보기
                      </a>
                      {" · "}
                      <a
                        className="font-medium text-periwinkle-700 underline-offset-2 hover:underline"
                        href={buildJobsAdminHref({ status: "rejected", source: activeSource })}
                      >
                        거절됨만 보기
                      </a>
                    </>
                  ) : activeStatus || activeSource ? (
                    "다른 필터를 선택하거나 크롤러를 실행해 보세요."
                  ) : (
                    "크롤러를 실행하거나 직접 공고를 추가해 주세요."
                  )}
                </p>
              </div>
              )
            }
          />
        </div>

      </div>
    </div>
  );
}
