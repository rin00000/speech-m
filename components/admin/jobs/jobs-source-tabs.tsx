"use client";

import Link from "next/link";
import { buildJobsAdminHref } from "@/lib/jobs/jobs-admin-urls";
import { useLoading } from "@/lib/ui/loading-context";
import type { JobSource, JobStatus } from "@/types/database.types";

type SourceCounts = Record<"all" | JobSource, number>;

export type JobsSourceTabsProps = {
  sourceCounts: SourceCounts;
  activeStatus: JobStatus | null;
  activeSource: JobSource | null;
  showRejected: boolean;
  query: string;
};

const STATUS_SCOPE_LABEL: Record<JobStatus, string> = {
  pending: "검토 중",
  approved: "승인됨",
  rejected: "거절됨",
};

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

const buildHref = (
  status: JobStatus | null,
  source: JobSource | null,
  showRejected: boolean,
  query: string
) =>
  buildJobsAdminHref({
    status: status ?? undefined,
    source: source ?? undefined,
    showRejected,
    q: query,
  });

const FilterTab = ({
  href,
  isActive,
  label,
  count,
  onClick,
}: {
  href: string;
  isActive: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) => (
  <Link
    href={href}
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium leading-none transition-colors ${
      isActive
        ? "border-periwinkle-600 bg-periwinkle-600 text-white"
        : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700"
    }`}
  >
    {label}
    <span
      className={`inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-xs tabular-nums ${
        isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
      }`}
    >
      {count}
    </span>
  </Link>
);

export const JobsSourceTabs = ({
  sourceCounts,
  activeStatus,
  activeSource,
  showRejected,
  query,
}: JobsSourceTabsProps) => {
  const hasFilter = activeStatus !== null || activeSource !== null || showRejected;
  const { startNavigation } = useLoading();

  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">출처</p>
            {activeStatus !== null && (
              <span className="text-[11px] text-gray-400">
                ({STATUS_SCOPE_LABEL[activeStatus]} 기준 건수)
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterTab
              href={buildHref(activeStatus, null, showRejected, query)}
              isActive={activeSource === null}
              label="전체"
              count={sourceCounts.all}
              onClick={startNavigation}
            />

            <span className="mx-0.5 h-4 w-px shrink-0 bg-gray-200" />

            <span className="select-none text-[11px] font-medium text-gray-400">미디어잡</span>
            {SOURCE_TABS_MEDIAJOB.map(({ key, label }) => (
              <FilterTab
                key={key}
                href={buildHref(activeStatus, key, showRejected, query)}
                isActive={activeSource === key}
                label={label}
                count={sourceCounts[key]}
                onClick={startNavigation}
              />
            ))}

            <span className="mx-0.5 h-4 w-px shrink-0 bg-gray-200" />

            {SOURCE_TABS_OTHER.map(({ key, label }) => (
              <FilterTab
                key={key}
                href={buildHref(activeStatus, key, showRejected, query)}
                isActive={activeSource === key}
                label={label}
                count={sourceCounts[key]}
                onClick={startNavigation}
              />
            ))}
          </div>
        </div>
      </div>

      {hasFilter && (
        <Link
          href="/jobs"
          onClick={startNavigation}
          className="shrink-0 text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
        >
          초기화
        </Link>
      )}
    </div>
  );
};
