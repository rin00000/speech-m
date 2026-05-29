/**
 * 공고 목록이 비었을 때 보여주는 안내 패널.
 * 필터/거절 숨김 상태별 문구와 이동 링크를 한곳에서 관리한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { Briefcase01Icon } from "@hugeicons/core-free-icons";
import { buildJobsAdminHref } from "@/lib/jobs/jobs-admin-urls";
import type { JobSource, JobStatus } from "@/types/database.types";

type JobsEmptyStateProps = {
  activeStatus: JobStatus | null;
  activeSource: JobSource | null;
  hideRejectedInList: boolean;
  rejectedCount: number;
};

export function JobsEmptyState({
  activeStatus,
  activeSource,
  hideRejectedInList,
  rejectedCount,
}: JobsEmptyStateProps) {
  return (
    <div className="px-4 py-16 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400">
        <HugeiconsIcon icon={Briefcase01Icon} size={28} color="currentColor" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-sm font-medium text-gray-600">
        {hideRejectedInList && rejectedCount > 0
          ? "보류·승인 공고가 없습니다. 거절만 있는 경우 아래에서 거절 목록을 여세요."
          : activeStatus || activeSource
            ? "해당 조건의 공고가 없습니다"
            : "등록된 공고가 없습니다"}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        {hideRejectedInList && rejectedCount > 0 ? (
          <>
            거절 {rejectedCount}건은 기본 목록에서 숨깁니다.{" "}
            <a
              className="font-medium text-periwinkle-700 underline-offset-2 hover:underline"
              href={buildJobsAdminHref({ source: activeSource, showRejected: true })}
            >
              거절 포함해 보기
            </a>
            {" · "}
            <a
              className="font-medium text-periwinkle-700 underline-offset-2 hover:underline"
              href={buildJobsAdminHref({ status: "rejected", source: activeSource })}
            >
              거절됨만 보기
            </a>
          </>
        ) : activeStatus || activeSource ? (
          "다른 필터를 선택하거나 크롤러를 실행해 보세요."
        ) : (
          "크롤러를 실행하거나 직접 공고를 추가해 주세요."
        )}
      </p>
    </div>
  );
}
