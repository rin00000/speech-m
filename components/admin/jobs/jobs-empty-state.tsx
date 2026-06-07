import { buildJobsAdminHref } from "@/lib/jobs/jobs-admin-urls";
import type { JobSource, JobStatus } from "@/types/database.types";
import { EmptyState } from "@/components/ui/empty-state";

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
    <EmptyState
      icon="💼"
      title={
        hideRejectedInList && rejectedCount > 0
          ? "보류·승인 공고가 없습니다"
          : activeStatus || activeSource
            ? "해당 조건의 공고가 없습니다"
            : "등록된 공고가 없습니다"
      }
      description={
        hideRejectedInList && rejectedCount > 0 ? (
          <>
            거절 {rejectedCount}건은 기본 목록에서 숨깁니다.<br />
            <a
              className="font-bold text-periwinkle-700 underline-offset-2 hover:underline"
              href={buildJobsAdminHref({ source: activeSource, showRejected: true })}
            >
              거절 포함해 보기
            </a>
            {" · "}
            <a
              className="font-bold text-periwinkle-700 underline-offset-2 hover:underline"
              href={buildJobsAdminHref({ status: "rejected", source: activeSource })}
            >
              거절됨만 보기
            </a>
          </>
        ) : activeStatus || activeSource ? (
          "다른 필터를 선택하거나 검색 조건을 변경해 보세요."
        ) : (
          "아직 등록된 채용 공고가 없습니다."
        )
      }
      className="my-10 border-none bg-transparent shadow-none"
    />
  );
}
