import { createAdminClient } from "@/lib/supabase/server";
import { Header } from "@/components/admin/header";
import { CrawlButton } from "@/components/admin/crawl-button";
import { JobActions } from "@/components/admin/job-actions";
import { JobsFilter } from "@/components/admin/jobs-filter";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  Add01Icon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";
import type { Database, JobSource, JobStatus } from "@/types/database.types";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

const SOURCE_LABEL: Record<JobPosting["source"], string> = {
  mediajob_announcer: "아나운서",
  mediajob_reporter:  "기자",
  mediajob_intern:    "인턴",
  saramin:            "사람인",
  arang:              "아랑카페",
  custom:             "직접입력",
};

const STATUS_STYLE: Record<
  JobPosting["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "검토 중",
    className: "bg-amber-50 text-amber-600 ring-amber-200",
  },
  approved: {
    label: "승인됨",
    className: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  },
  rejected: {
    label: "거절됨",
    className: "bg-red-50 text-red-500 ring-red-200",
  },
};

const VALID_STATUSES = ["pending", "approved", "rejected"] as const;
const VALID_SOURCES = ["mediajob_announcer", "mediajob_reporter", "mediajob_intern", "saramin", "arang", "custom"] as const;

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
  const statusCounts = {
    all:      rows.length,
    pending:  rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };
  const sourceCounts = {
    all:                 rows.length,
    mediajob_announcer:  rows.filter((r) => r.source === "mediajob_announcer").length,
    mediajob_reporter:   rows.filter((r) => r.source === "mediajob_reporter").length,
    mediajob_intern:     rows.filter((r) => r.source === "mediajob_intern").length,
    saramin:             rows.filter((r) => r.source === "saramin").length,
    arang:               rows.filter((r) => r.source === "arang").length,
    custom:              rows.filter((r) => r.source === "custom").length,
  };

  return (
    <div className="flex flex-col">
      <Header
        title="공고 관리"
        description="미디어잡, 회사 홈페이지 등에서 수집된 공고를 관리합니다."
      />

      <div className="flex-1 p-6">
        <div className="mb-5 flex items-center justify-between">
          <JobsFilter
            statusCounts={statusCounts}
            sourceCounts={sourceCounts}
            activeStatus={activeStatus}
            activeSource={activeSource}
          />
          <div className="flex items-center gap-2">
            <CrawlButton apiPath="/api/crawl/mediajob" label="미디어잡 수집" />
            <CrawlButton apiPath="/api/crawl/saramin" label="사람인 수집" />
            <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
              <HugeiconsIcon
                icon={Add01Icon}
                size={15}
                color="currentColor"
                strokeWidth={2}
              />
              공고 추가
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        )}

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
              {activeStatus || activeSource ? "해당 조건의 공고가 없습니다" : "등록된 공고가 없습니다"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {activeStatus || activeSource
                ? "다른 필터를 선택하거나 크롤러를 실행해 보세요."
                : "크롤러를 실행하거나 직접 공고를 추가해 주세요."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">공고명</th>
                  <th className="px-4 py-3">회사</th>
                  <th className="px-4 py-3">소스</th>
                  <th className="px-4 py-3">마감일</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">링크</th>
                  <th className="px-4 py-3">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {jobs.map((job) => {
                  const status = STATUS_STYLE[job.status];
                  return (
                    <tr
                      key={job.id}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {job.title}
                        {job.location && (
                          <span className="ml-2 text-xs text-slate-400">
                            {job.location}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {job.company ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {SOURCE_LABEL[job.source]}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {job.deadline ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={job.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-slate-400 transition-colors hover:text-indigo-500"
                        >
                          <HugeiconsIcon
                            icon={LinkSquare01Icon}
                            size={16}
                            color="currentColor"
                            strokeWidth={1.5}
                          />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <JobActions jobId={job.id} status={job.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
