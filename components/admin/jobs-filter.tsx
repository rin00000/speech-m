"use client";

import Link from "next/link";
import type { JobSource, JobStatus } from "@/types/database.types";

type StatusCounts = Record<"all" | JobStatus, number>;
type SourceCounts = Record<"all" | JobSource, number>;

type Props = {
  statusCounts: StatusCounts;
  sourceCounts: SourceCounts;
  activeStatus: JobStatus | null;
  activeSource: JobSource | null;
};

const STATUS_TABS: { key: JobStatus | null; label: string }[] = [
  { key: null,       label: "전체" },
  { key: "pending",  label: "검토 중" },
  { key: "approved", label: "승인됨" },
  { key: "rejected", label: "거절됨" },
];

const SOURCE_TABS: { key: JobSource | null; label: string }[] = [
  { key: null,                  label: "전체" },
  { key: "mediajob_announcer",  label: "아나운서" },
  { key: "mediajob_reporter",   label: "기자" },
  { key: "mediajob_intern",     label: "인턴" },
  { key: "saramin",             label: "사람인" },
  { key: "arang",               label: "아랑카페" },
  { key: "custom",              label: "직접입력" },
];

const buildHref = (status: JobStatus | null, source: JobSource | null) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  const qs = params.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
};

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

export const JobsFilter = ({
  statusCounts,
  sourceCounts,
  activeStatus,
  activeSource,
}: Props) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-1">
      {STATUS_TABS.map(({ key, label }) => (
        <FilterTab
          key={key ?? "all-status"}
          href={buildHref(key, activeSource)}
          isActive={activeStatus === key}
          label={label}
          count={key === null ? statusCounts.all : statusCounts[key]}
        />
      ))}
    </div>
    <div className="flex items-center gap-1">
      {SOURCE_TABS.map(({ key, label }) => (
        <FilterTab
          key={key ?? "all-source"}
          href={buildHref(activeStatus, key)}
          isActive={activeSource === key}
          label={label}
          count={key === null ? sourceCounts.all : sourceCounts[key]}
        />
      ))}
    </div>
  </div>
);
