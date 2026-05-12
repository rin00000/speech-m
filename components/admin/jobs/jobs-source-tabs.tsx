import Link from "next/link";
import { buildJobsAdminHref } from "@/lib/jobs/jobs-admin-urls";
import type { JobSource, JobStatus } from "@/types/database.types";

type SourceCounts = Record<"all" | JobSource, number>;

export type JobsSourceTabsProps = {
  sourceCounts: SourceCounts;
  activeStatus: JobStatus | null;
  activeSource: JobSource | null;
  showRejected: boolean;
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

const buildHref = (status: JobStatus | null, source: JobSource | null) =>
  buildJobsAdminHref({
    status: status ?? undefined,
    source: source ?? undefined,
  });

const FilterTab = ({
  href,
  isActive,
  label,
  count,
}: {
  href: string;
  isActive: boolean;
  label: string;
  count: number;
}) => (
  <Link
    href={href}
    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-slate-900 text-white"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    }`}
  >
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

export const JobsSourceTabs = ({
  sourceCounts,
  activeStatus,
  activeSource,
  showRejected,
}: JobsSourceTabsProps) => {
  const hasFilter = activeStatus !== null || activeSource !== null || showRejected;

  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-3">
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
          className="shrink-0 text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
        >
          초기화
        </Link>
      )}
    </div>
  );
};
