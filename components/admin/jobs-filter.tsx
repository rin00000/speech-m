"use client";

import Link from "next/link";
import { buildJobsAdminHref } from "@/lib/jobs/jobs-admin-urls";
import type { JobSource, JobStatus } from "@/types/database.types";

type StatusCounts = Record<"all" | JobStatus, number>;
type SourceCounts = Record<"all" | JobSource, number>;

type Props = {
  statusCounts: StatusCounts;
  /** 기본 목록(거절 숨김)에서 쓰는 보류+승인 합계. */
  workQueueCount: number;
  sourceCounts: SourceCounts;
  activeStatus: JobStatus | null;
  activeSource: JobSource | null;
  showRejected: boolean;
};

const STATUS_DOT: Record<JobStatus, string> = {
  pending: "bg-amber-400",
  approved: "bg-emerald-500",
  rejected: "bg-red-400",
};

const STATUS_SCOPE_LABEL: Record<JobStatus, string> = {
  pending: "검토 중",
  approved: "승인됨",
  rejected: "거절됨",
};

const STATUS_TABS: { key: JobStatus; label: string }[] = [
  { key: "pending", label: "검토 중" },
  { key: "approved", label: "승인됨" },
  { key: "rejected", label: "거절됨" },
];

const SOURCE_TABS_MEDIAJOB: { key: JobSource; label: string }[] = [
  { key: "mediajob_announcer", label: "아나운서" },
  { key: "mediajob_reporter", label: "기자" },
  { key: "mediajob_intern", label: "인턴" },
];

const SOURCE_TABS_OTHER: { key: JobSource; label: string }[] = [
  { key: "saramin", label: "사람인" },
  { key: "jobkorea", label: "잡코리아" },
  { key: "arang", label: "아랑카페" },
  { key: "custom", label: "직접입력" },
];

const buildHref = (status: JobStatus | null, source: JobSource | null, showRejectedTab?: boolean) =>
  buildJobsAdminHref({
    status: status ?? undefined,
    source: source ?? undefined,
    showRejected: showRejectedTab ? true : undefined,
  });

const FilterTab = ({
  href,
  isActive,
  label,
  count,
  dot,
}: {
  href: string;
  isActive: boolean;
  label: string;
  count: number;
  dot?: string;
}) => (
  <Link
    href={href}
    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-slate-900 text-white"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    }`}
  >
    {dot && (
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot} ${isActive ? "opacity-90" : ""}`} />
    )}
    {label}
    <span
      className={`inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-xs tabular-nums ${
        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
      }`}
    >
      {count}
    </span>
  </Link>
);

export const JobsFilter = ({
  statusCounts,
  workQueueCount,
  sourceCounts,
  activeStatus,
  activeSource,
  showRejected,
}: Props) => {
  const hasFilter = activeStatus !== null || activeSource !== null || showRejected;

  const mainStatusLabel = showRejected ? "전체" : "작업 대상";
  const mainStatusCount = showRejected ? statusCounts.all : workQueueCount;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">상태</p>
          <div className="flex flex-wrap items-center gap-1">
            <FilterTab
              href={buildHref(null, activeSource, showRejected)}
              isActive={activeStatus === null}
              label={mainStatusLabel}
              count={mainStatusCount}
            />
            {STATUS_TABS.map(({ key, label }) => (
              <FilterTab
                key={key}
                href={buildHref(key, activeSource)}
                isActive={activeStatus === key}
                label={label}
                count={statusCounts[key]}
                dot={STATUS_DOT[key]}
              />
            ))}
          </div>
          {!showRejected && statusCounts.rejected > 0 ? (
            <p className="mt-1.5 text-[11px] text-slate-500">
              거절 {statusCounts.rejected}건은 기본에서 숨깁니다.{" "}
              <Link
                href={buildHref(null, activeSource, true)}
                className="font-medium text-indigo-600 underline-offset-2 hover:underline"
              >
                DB 전체 보기
              </Link>
            </p>
          ) : showRejected ? (
            <p className="mt-1.5 text-[11px] text-slate-500">
              <Link
                href={buildHref(null, activeSource, false)}
                className="font-medium text-indigo-600 underline-offset-2 hover:underline"
              >
                작업 대상만(거절 숨김)
              </Link>
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">출처</p>
            {activeStatus !== null && (
              <span className="text-[11px] text-slate-400">
                ({STATUS_SCOPE_LABEL[activeStatus]} 기준 건수)
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterTab
              href={buildHref(activeStatus, null)}
              isActive={activeSource === null}
              label="전체"
              count={sourceCounts.all}
            />

            <span className="mx-0.5 h-4 w-px shrink-0 bg-slate-200" />

            <span className="select-none text-[11px] font-medium text-slate-400">미디어잡</span>
            {SOURCE_TABS_MEDIAJOB.map(({ key, label }) => (
              <FilterTab
                key={key}
                href={buildHref(activeStatus, key)}
                isActive={activeSource === key}
                label={label}
                count={sourceCounts[key]}
              />
            ))}

            <span className="mx-0.5 h-4 w-px shrink-0 bg-slate-200" />

            {SOURCE_TABS_OTHER.map(({ key, label }) => (
              <FilterTab
                key={key}
                href={buildHref(activeStatus, key)}
                isActive={activeSource === key}
                label={label}
                count={sourceCounts[key]}
              />
            ))}
          </div>
        </div>
      </div>

      {hasFilter && (
        <Link
          href="/jobs"
          className="shrink-0 pt-5 text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
        >
          초기화
        </Link>
      )}
    </div>
  );
};
