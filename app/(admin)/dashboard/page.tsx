import { NaverShareIconLink } from "@/components/admin/naver-share-icon-link";
import { Header } from "@/components/admin/header";
import { SOURCE_LABEL } from "@/lib/jobs/constants";
import { buildNaverShareUrl } from "@/lib/jobs/naver-share";
import { getPublicSiteOrigin } from "@/lib/jobs/site-url";
import { relativeTime } from "@/lib/jobs/utils";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  CheckmarkCircle01Icon,
  ChartLineData02Icon,
  JobShareIcon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";

type JobPosting = Pick<
  Database["public"]["Tables"]["job_postings"]["Row"],
  "id" | "title" | "company" | "location" | "source" | "source_url" | "deadline" | "published_at"
>;

const formatCount = (count: number | null) => (count ?? 0).toLocaleString("ko-KR");

const getMonthStartIso = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

export default async function DashboardPage() {
  const supabase = createAdminClient();
  const monthStartIso = getMonthStartIso();

  const [
    totalJobsResult,
    approvedJobsResult,
    publishedJobsResult,
    monthlyPublishedJobsResult,
    recentPublishedJobsResult,
  ] = await Promise.all([
    supabase.from("job_postings").select("id", { count: "exact", head: true }),
    supabase
      .from("job_postings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("job_postings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .not("published_at", "is", null),
    supabase
      .from("job_postings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .not("published_at", "is", null)
      .gte("published_at", monthStartIso),
    supabase
      .from("job_postings")
      .select("id,title,company,location,source,source_url,deadline,published_at")
      .eq("status", "approved")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(6)
      .returns<JobPosting[]>(),
  ]);

  const hasJobsError = [
    totalJobsResult,
    approvedJobsResult,
    publishedJobsResult,
    monthlyPublishedJobsResult,
    recentPublishedJobsResult,
  ].some((result) => result.error);

  const recentPublishedJobs = recentPublishedJobsResult.data ?? [];
  const siteOrigin = getPublicSiteOrigin();
  const statCards = [
    {
      label: "등록된 공고",
      value: formatCount(totalJobsResult.count),
      sub: "전체 공고 수",
      icon: Briefcase01Icon,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
    {
      label: "승인된 공고",
      value: formatCount(approvedJobsResult.count),
      sub: "HITL 검수 통과",
      icon: CheckmarkCircle01Icon,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      label: "내부 게시",
      value: formatCount(publishedJobsResult.count),
      sub: "승인 후 게시 확정",
      icon: JobShareIcon,
      color: "text-sky-500",
      bg: "bg-sky-50",
    },
    {
      label: "이번 달 게시",
      value: formatCount(monthlyPublishedJobsResult.count),
      sub: "이번 달 내부 게시",
      icon: ChartLineData02Icon,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="대시보드"
        description="Speech-M 아카데미 현황을 한눈에 확인하세요."
      />

      <div className="flex-1 p-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>
                <span className={`rounded-lg p-2 ${card.bg} ${card.color}`}>
                  <HugeiconsIcon
                    icon={card.icon}
                    size={18}
                    color="currentColor"
                    strokeWidth={1.5}
                  />
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-800">
                  {card.value}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                최근 내부 게시 공고
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                승인 후 내부 게시가 확정된 최신 공고입니다.
              </p>
            </div>
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-600">
              {formatCount(publishedJobsResult.count)}건
            </span>
          </div>
          {hasJobsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              공고 데이터를 불러오는 중 오류가 발생했습니다.
            </div>
          ) : recentPublishedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">
                내부 게시가 확정된 승인 공고가 없습니다.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                공고 관리에서 승인 공고를 내부 게시하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPublishedJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {job.title}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {SOURCE_LABEL[job.source]}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span>{job.company ?? "회사명 미상"}</span>
                      <span>마감 {job.deadline ?? "미정"}</span>
                      <span title={job.published_at ?? undefined}>
                        내부 게시 {job.published_at ? relativeTime(job.published_at) : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {siteOrigin ? (
                      <NaverShareIconLink
                        href={buildNaverShareUrl(
                          {
                            id: job.id,
                            title: job.title,
                            company: job.company,
                            location: job.location,
                            deadline: job.deadline,
                            source: job.source,
                            source_url: job.source_url,
                          },
                          siteOrigin,
                        )}
                        title="네이버 공유하기"
                        iconType="c"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:bg-emerald-50 hover:opacity-90"
                      />
                    ) : null}
                    <a
                      href={job.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-500"
                      title="원문 보기"
                    >
                      <HugeiconsIcon icon={LinkSquare01Icon} size={16} color="currentColor" strokeWidth={1.6} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
