import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  GridViewIcon,
} from "@hugeicons/core-free-icons";
import { buildJobsAdminHref } from "@/lib/jobs/jobs-admin-urls";
import type { JobSource, JobStatus } from "@/types/database.types";
import { cn } from "@/lib/ui/cn";

type JobsStatusSummaryProps = {
  statusCounts: Record<"all" | JobStatus, number>;
  workQueueCount: number;
  activeSource: JobSource | null;
  activeStatus: JobStatus | null;
  showRejected: boolean;
  rejectedRetentionDays: number;
};

export function JobsStatusSummary({
  statusCounts,
  workQueueCount,
  activeSource,
  activeStatus,
  showRejected,
  rejectedRetentionDays,
}: JobsStatusSummaryProps) {
  const statCards: {
    label: string;
    value: number;
    icon: typeof GridViewIcon;
    activeBg: string;
    activeText: string;
    status: JobStatus | null;
    href: string;
    scope: "work" | "all";
  }[] = [
    {
      label: showRejected ? "전체" : "작업 대상",
      value: showRejected ? statusCounts.all : workQueueCount,
      icon: GridViewIcon,
      activeBg: "bg-job-gray-100",
      activeText: "text-job-gray-900",
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
      activeBg: "bg-job-yellow-100",
      activeText: "text-job-yellow-900",
      status: "pending",
      href: buildJobsAdminHref({ status: "pending", source: activeSource }),
      scope: "work",
    },
    {
      label: "승인됨",
      value: statusCounts.approved,
      icon: CheckmarkCircle01Icon,
      activeBg: "bg-emerald-100",
      activeText: "text-emerald-900",
      status: "approved",
      href: buildJobsAdminHref({ status: "approved", source: activeSource }),
      scope: "work",
    },
    {
      label: "거절됨",
      value: statusCounts.rejected,
      icon: Cancel01Icon,
      activeBg: "bg-red-100",
      activeText: "text-red-900",
      status: "rejected",
      href: buildJobsAdminHref({ status: "rejected", source: activeSource }),
      scope: "work",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 md:flex-nowrap md:gap-3">
        {statCards.map(({ label, value, icon, activeBg, activeText, status: cardStatus, href, scope }) => {
          const isActive =
            cardStatus === null
              ? activeStatus === null && (scope === "all" ? showRejected : !showRejected)
              : activeStatus === cardStatus;
          
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "group relative flex flex-1 items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-200 md:p-4",
                isActive
                  ? `border-transparent ${activeBg} shadow-sm`
                  : "border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    isActive ? activeText : "bg-gray-100 text-gray-500 shadow-sm group-hover:bg-gray-200 group-hover:text-gray-700"
                  )}
                >
                  <HugeiconsIcon icon={icon} size={20} color="currentColor" strokeWidth={isActive ? 2 : 1.5} />
                </span>
                <div className="flex flex-col">
                  <span className={cn("text-xs font-semibold", isActive ? activeText : "text-gray-500 group-hover:text-gray-700")}>
                    {label}
                  </span>
                  <span className={cn("text-xl font-extrabold leading-none", isActive ? activeText : "text-gray-900")}>
                    {value}
                  </span>
                </div>
              </div>
              
              {isActive && (
                <div className={cn("hidden h-2 w-2 rounded-full md:block", activeText.replace('text-', 'bg-'))} />
              )}
            </Link>
          );
        })}
      </div>
      
      {/* info messages */}
      <div className="flex justify-between items-center px-1 pt-1">
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
        ) : <span />}
        <p className="text-[11px] text-gray-400 hidden sm:block">
          거절 처리 후 {rejectedRetentionDays}일 뒤 영구 삭제
        </p>
      </div>
    </div>
  );
}
