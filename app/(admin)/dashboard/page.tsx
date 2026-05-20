import { AiPostPromptCopyButton } from "@/components/admin/jobs/ai-post-prompt-copy-button";
import { NaverShareIconLink } from "@/components/admin/jobs/naver-share-icon-link";
import { Header } from "@/components/admin/layout/header";
import { SOURCE_LABEL } from "@/lib/jobs/constants";
import { buildBlogContent, buildNaverShareUrl } from "@/lib/jobs/naver-share";
import { getPublicSiteOrigin } from "@/lib/jobs/site-url";
import { activeDeadlineOrExpression, isExpiredDeadline } from "@/lib/jobs/deadline";
import { relativeTime } from "@/lib/jobs/utils";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare01Icon } from "@hugeicons/core-free-icons";

type JobPosting = Pick<
  Database["public"]["Tables"]["job_postings"]["Row"],
  "id" | "title" | "company" | "location" | "source" | "source_url" | "deadline" | "published_at"
>;

export default async function DashboardPage() {
  const supabase = createAdminClient();
  const activeDeadline = activeDeadlineOrExpression();

  const recentPublishedJobsResult = await supabase
    .from("job_postings")
    .select("id,title,company,location,source,source_url,deadline,published_at")
    .eq("status", "approved")
    .not("published_at", "is", null)
    .or(activeDeadline)
    .order("published_at", { ascending: false })
    .limit(6)
    .returns<JobPosting[]>();

  const hasJobsError = Boolean(recentPublishedJobsResult.error);

  const recentPublishedJobs = (recentPublishedJobsResult.data ?? []).filter(
    (job) => !isExpiredDeadline(job.deadline),
  );
  const siteOrigin = getPublicSiteOrigin();

  return (
    <div className="flex flex-col">
      <Header
        title="대시보드"
        description="Speech-M 아카데미 현황을 한눈에 확인하세요."
      />

      <div className="flex-1 p-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold leading-tight text-gray-800">
              최근 내부 게시 공고
            </h2>
            <p className="mt-1 text-xs leading-tight text-gray-500">
              승인 후 내부 게시가 확정된 최신 공고입니다.
            </p>
          </div>
          {hasJobsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              공고 데이터를 불러오는 중 오류가 발생했습니다.
            </div>
          ) : recentPublishedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 py-12 text-center">
              <p className="text-sm font-medium text-gray-500">
                내부 게시가 확정된 승인 공고가 없습니다.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                공고 관리에서 승인 공고를 내부 게시하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentPublishedJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium leading-tight text-gray-800">
                        {job.title}
                      </p>
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium leading-none text-gray-500">
                        {SOURCE_LABEL[job.source]}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
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
                        title={`네이버 공유하기\n\n${buildBlogContent({
                          title: job.title,
                          company: job.company,
                          location: job.location,
                          deadline: job.deadline,
                          source: job.source,
                          source_url: job.source_url,
                        })}`}
                        iconType="a"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-emerald-50 hover:opacity-90"
                      />
                    ) : null}
                    <AiPostPromptCopyButton jobId={job.id} />
                    {job.source_url ? (
                      <a
                        href={job.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-periwinkle-100 hover:text-periwinkle-700"
                        title="원문 보기"
                      >
                        <HugeiconsIcon icon={LinkSquare01Icon} size={16} color="currentColor" strokeWidth={1.6} />
                      </a>
                    ) : null}
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
