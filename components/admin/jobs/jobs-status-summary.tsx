/**
 * 공고 관리 페이지 상단의 상태 요약 카드.
 * 페이지 파일은 데이터 집계만 맡고, 필터 이동 UI와 거절 보관 안내는 이 컴포넌트가 담당한다.
 */

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  GridViewIcon,
} from "@hugeicons/core-free-icons";
import { cardActionClassName } from "@/components/ui/card";
import { buildJobsAdminHref } from "@/lib/jobs/jobs-admin-urls";
import type { JobSource, JobStatus } from "@/types/database.types";

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
    accent: string;
    bar: string;
    status: JobStatus | null;
    href: string;
    scope: "work" | "all";
  }[] = [
    {
      label: showRejected ? "전체" : "작업 대상",
      value: showRejected ? statusCounts.all : workQueueCount,
      icon: GridViewIcon,
      accent: "text-gray-600 bg-gray-100",
      bar: "bg-gray-400",
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
      accent: "text-amber-600 bg-amber-50",
      bar: "bg-amber-400",
      status: "pending",
      href: buildJobsAdminHref({ status: "pending", source: activeSource }),
      scope: "work",
    },
    {
      label: "승인됨",
      value: statusCounts.approved,
      icon: CheckmarkCircle01Icon,
      accent: "text-emerald-600 bg-emerald-50",
      bar: "bg-emerald-500",
      status: "approved",
      href: buildJobsAdminHref({ status: "approved", source: activeSource }),
      scope: "work",
    },
    {
      label: "거절됨",
      value: statusCounts.rejected,
      icon: Cancel01Icon,
      accent: "text-red-500 bg-red-50",
      bar: "bg-red-400",
      status: "rejected",
      href: buildJobsAdminHref({ status: "rejected", source: activeSource }),
      scope: "work",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ label, value, icon, accent, bar, status: cardStatus, href, scope }) => {
          const isActive =
            cardStatus === null
              ? activeStatus === null && (scope === "all" ? showRejected : !showRejected)
              : activeStatus === cardStatus;
          return (
            <Link
              key={label}
              href={href}
              className={cardActionClassName({
                selected: isActive,
                className: "relative block overflow-hidden p-3 md:p-4",
              })}
            >
              <div className={`absolute left-0 top-0 h-full w-1 ${bar} rounded-l-xl`} />
              <div className="flex items-center justify-between gap-2 pl-2">
                <div>
                  <p className="text-xs font-medium leading-tight text-gray-500">{label}</p>
                  <p className="mt-1 text-xl font-extrabold leading-[1.1] tabular-nums text-gray-900 md:text-2xl">
                    {value}
                  </p>
                </div>
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 md:h-9 md:w-9 ${accent}`}
                >
                  <HugeiconsIcon icon={icon} size={18} color="currentColor" strokeWidth={1.8} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

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
      ) : null}
      <p className="text-[11px] leading-snug text-gray-400">
        거절 공고는 거절 확정 시각 기준 {rejectedRetentionDays}일이 지나면 정리 크론 실행 시
        DB에서 자동 삭제됩니다. 수동 삭제와 동일하게 해당 URL은 다시 수집되지 않습니다.
      </p>
    </div>
  );
}
