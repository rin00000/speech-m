import { createAdminClient } from "@/lib/supabase/server";
import { Header } from "@/components/admin/header";
import { CrawlButton } from "@/components/admin/crawl-button";
import { JobsFilter } from "@/components/admin/jobs-filter";
import { JobsTable } from "@/components/admin/jobs-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  Add01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Clock01Icon,
  GridViewIcon,
} from "@hugeicons/core-free-icons";
import type { Database, JobSource, JobStatus } from "@/types/database.types";

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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const { status: rawStatus, source: rawSource } = await searchParams;

  const activeStatus = VALID_STATUSES.includes(rawStatus as JobStatus)
    ? (rawStatus as JobStatus)
    : null;
  const activeSource = VALID_SOURCES.includes(rawSource as JobSource)
    ? (rawSource as JobSource)
    : null;

  const supabase = createAdminClient();

  const [{ data: allForCounts }, { data: jobs, error }] = await Promise.all([
    supabase.from("job_postings").select("status, source"),
    (() => {
      let q = supabase
        .from("job_postings")
        .select("*")
        .order("created_at", { ascending: false });
      if (activeStatus) q = q.eq("status", activeStatus);
      if (activeSource) q = q.eq("source", activeSource);
      return q.returns<JobPosting[]>();
    })(),
  ]);

  const rows = allForCounts ?? [];
  const { statusCounts, sourceCounts } = rows.reduce(
    (acc, r: { status: JobStatus; source: JobSource }) => {
      acc.statusCounts[r.status]++;
      acc.sourceCounts[r.source]++;
      return acc;
    },
    {
      statusCounts: { all: rows.length, pending: 0, approved: 0, rejected: 0 } as Record<"all" | JobStatus, number>,
      sourceCounts: {
        all: rows.length,
        mediajob_announcer: 0,
        mediajob_reporter: 0,
        mediajob_intern: 0,
        saramin: 0,
        jobkorea: 0,
        arang: 0,
        custom: 0,
      } as Record<"all" | JobSource, number>,
    },
  );

  const statCards = [
    {
      label: "전체",
      value: statusCounts.all,
      icon: GridViewIcon,
      accent: "text-slate-600 bg-slate-100",
      bar: "bg-slate-400",
    },
    {
      label: "검토 중",
      value: statusCounts.pending,
      icon: Clock01Icon,
      accent: "text-amber-600 bg-amber-50",
      bar: "bg-amber-400",
    },
    {
      label: "승인됨",
      value: statusCounts.approved,
      icon: CheckmarkCircle01Icon,
      accent: "text-emerald-600 bg-emerald-50",
      bar: "bg-emerald-500",
    },
    {
      label: "거절됨",
      value: statusCounts.rejected,
      icon: Cancel01Icon,
      accent: "text-red-500 bg-red-50",
      bar: "bg-red-400",
    },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="공고 관리"
        description="미디어잡, 회사 홈페이지 등에서 수집된 공고를 관리합니다."
      />

      <div className="flex-1 space-y-5 p-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map(({ label, value, icon, accent, bar }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className={`absolute left-0 top-0 h-full w-1 ${bar} rounded-l-xl`} />
              <div className="flex items-center justify-between pl-2">
                <div>
                  <p className="text-xs font-medium text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{value}</p>
                </div>
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
                  <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.8} />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter + Actions row */}
        <div className="flex items-start justify-between gap-4">
          <JobsFilter
            statusCounts={statusCounts}
            sourceCounts={sourceCounts}
            activeStatus={activeStatus}
            activeSource={activeSource}
          />
          <div className="flex shrink-0 items-center gap-2">
            <CrawlButton apiPath="/api/crawl/mediajob" label="미디어잡 수집" />
            <CrawlButton apiPath="/api/crawl/saramin" label="사람인 수집" />
            <CrawlButton apiPath="/api/crawl/jobkorea" label="잡코리아 수집" />
            <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
              <HugeiconsIcon icon={Add01Icon} size={15} color="currentColor" strokeWidth={2} />
              공고 추가
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        )}

        {/* Empty state */}
        {!jobs || jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <HugeiconsIcon
                icon={Briefcase01Icon}
                size={28}
                color="currentColor"
                strokeWidth={1.5}
              />
            </span>
            <p className="mt-4 text-sm font-medium text-slate-600">
              {activeStatus || activeSource
                ? "해당 조건의 공고가 없습니다"
                : "등록된 공고가 없습니다"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {activeStatus || activeSource
                ? "다른 필터를 선택하거나 크롤러를 실행해 보세요."
                : "크롤러를 실행하거나 직접 공고를 추가해 주세요."}
            </p>
          </div>
        ) : (
          <JobsTable jobs={jobs} />
        )}
      </div>
    </div>
  );
}
