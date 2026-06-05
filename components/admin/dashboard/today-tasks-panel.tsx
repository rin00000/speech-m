/**
 * 관리자 대시보드 상단의 오늘 할 일 요약 패널.
 * 등업 요청과 AI 필터 후 HITL 대기 공고처럼 즉시 확인할 운영 항목을 모아 보여준다.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Briefcase01Icon,
  CheckmarkCircle01Icon,
  Task01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { parseAiFitSnapshot } from "@/lib/ai/job-fit/domain/ai-fit-snapshot";
import { SOURCE_LABEL } from "@/lib/jobs/constants";
import { buildJobsAdminHref } from "@/lib/jobs/jobs-admin-urls";
import type { StudentUpgradeRequestItem } from "./student-upgrade-requests-panel";
import type { Database } from "@/types/database.types";

export type TodayTaskAiPendingJob = Pick<
  Database["public"]["Tables"]["job_postings"]["Row"],
  "id" | "title" | "company" | "source" | "created_at" | "ai_fit_snapshot"
>;

type TodayTasksPanelProps = {
  pendingUpgradeRequests: StudentUpgradeRequestItem[];
  hasUpgradeRequestsError: boolean;
  aiPendingJobs: TodayTaskAiPendingJob[];
  aiPendingJobCount: number;
  hasAiPendingJobsError: boolean;
};

export function TodayTasksPanel({
  pendingUpgradeRequests,
  hasUpgradeRequestsError,
  aiPendingJobs,
  aiPendingJobCount,
  hasAiPendingJobsError,
}: TodayTasksPanelProps) {
  const totalTaskCount =
    (hasUpgradeRequestsError ? 0 : pendingUpgradeRequests.length) +
    (hasAiPendingJobsError ? 0 : aiPendingJobCount);
  const hasErrors = hasUpgradeRequestsError || hasAiPendingJobsError;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700">
            <HugeiconsIcon icon={Task01Icon} size={18} color="currentColor" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-gray-900">오늘 할 일</h2>
            <p className="mt-1 text-xs font-medium leading-snug text-gray-500">
              관리자 판단이 필요한 운영 항목만 모았습니다.
            </p>
          </div>
        </div>
        <span
          className={`inline-flex self-start rounded-full border px-3 py-1 text-xs font-extrabold leading-none ${
            hasErrors
              ? "border-red-200 bg-red-50 text-red-700"
              : totalTaskCount > 0
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {hasErrors ? "확인 필요" : totalTaskCount > 0 ? `${totalTaskCount}건` : "정상"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <TaskSummaryCard
          icon={UserIcon}
          title="등업 요청 대기"
          count={pendingUpgradeRequests.length}
          hasError={hasUpgradeRequestsError}
          emptyText="대기 중인 등업 요청이 없습니다."
          description={buildUpgradeDescription(pendingUpgradeRequests)}
          href={pendingUpgradeRequests.length > 0 ? "#student-upgrade-requests" : undefined}
          hrefLabel="요청 처리"
        />

        <TaskSummaryCard
          icon={Briefcase01Icon}
          title="AI 판단 대기 공고"
          count={aiPendingJobCount}
          hasError={hasAiPendingJobsError}
          emptyText="AI 필터 후 보류된 공고가 없습니다."
          description="AI가 자동 확정하지 못한 공고를 원장 검수 큐에서 확인합니다."
          href={buildJobsAdminHref({ status: "pending" })}
          hrefLabel="공고 검수"
        >
          {aiPendingJobs.length > 0 && (
            <div className="mt-3 space-y-2">
              {aiPendingJobs.map((job) => (
                <AiPendingJobPreview key={job.id} job={job} />
              ))}
            </div>
          )}
        </TaskSummaryCard>
      </div>
    </section>
  );
}

function TaskSummaryCard({
  icon,
  title,
  count,
  hasError,
  emptyText,
  description,
  href,
  hrefLabel,
  children,
}: {
  icon: typeof UserIcon;
  title: string;
  count: number;
  hasError: boolean;
  emptyText: string;
  description: string;
  href?: string;
  hrefLabel: string;
  children?: ReactNode;
}) {
  const isActionable = !hasError && count > 0;

  return (
    <article className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white ${
              hasError
                ? "border-red-100 text-red-600"
                : isActionable
                ? "border-amber-100 text-amber-600"
                : "border-emerald-100 text-emerald-600"
            }`}
          >
            <HugeiconsIcon
              icon={hasError ? AlertCircleIcon : isActionable ? icon : CheckmarkCircle01Icon}
              size={15}
              color="currentColor"
              strokeWidth={1.9}
            />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold leading-tight text-gray-900">{title}</h3>
            <p className="mt-1 text-xs font-medium leading-snug text-gray-500">
              {hasError ? "데이터를 불러오는 중 오류가 발생했습니다." : count > 0 ? description : emptyText}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-extrabold leading-none ${
            hasError
              ? "border-red-100 bg-red-50 text-red-700"
              : isActionable
              ? "border-amber-100 bg-amber-50 text-amber-700"
              : "border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          {hasError ? "오류" : `${count}건`}
        </span>
      </div>

      {children}

      {href && isActionable ? (
        <Link
          href={href}
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold leading-none text-gray-700 hover:bg-gray-50"
        >
          {hrefLabel}
          <HugeiconsIcon icon={ArrowRight01Icon} size={13} color="currentColor" />
        </Link>
      ) : null}
    </article>
  );
}

function AiPendingJobPreview({ job }: { job: TodayTaskAiPendingJob }) {
  const snapshot = parseAiFitSnapshot(job.ai_fit_snapshot);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold text-gray-800">{job.title}</p>
          <p className="mt-1 truncate text-[11px] font-semibold text-gray-400">
            {job.company ?? "회사명 미상"} · {SOURCE_LABEL[job.source]}
          </p>
        </div>
        {snapshot ? (
          <span className="shrink-0 rounded-full border border-periwinkle-100 bg-white px-2 py-1 text-[10px] font-extrabold leading-none text-periwinkle-700">
            AI {snapshot.score}점
          </span>
        ) : null}
      </div>
    </div>
  );
}

function buildUpgradeDescription(requests: StudentUpgradeRequestItem[]) {
  const first = requests[0];
  if (!first) return "대기 중인 등업 요청이 없습니다.";

  const name = first.display_name ?? first.email;
  const restCount = requests.length - 1;
  return restCount > 0 ? `${name} 외 ${restCount}명 승인 대기` : `${name} 승인 대기`;
}
