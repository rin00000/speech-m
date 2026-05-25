/**
 * 공고 관리 페이지 로딩 스켈레톤.
 * stat 카드 4개, 액션 버튼 영역, 테이블 구조를 반영한 뼈대 UI.
 */

import {
  Skeleton,
  SkeletonLine,
  SkeletonPageHeader,
  SkeletonStatCard,
  SkeletonTable,
  SkeletonActionBar,
} from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonPageHeader />

      <div className="flex-1 space-y-3 p-6">
        {/* stat 카드 4개 */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <SkeletonLine size="xs" width="1/3" />
        </div>

        {/* 액션 버튼 영역 */}
        <div className="flex flex-col gap-4">
          <SkeletonActionBar count={4} />

          {/* 테이블 */}
          <SkeletonTable rows={10} cols={11} />
        </div>
      </div>
    </div>
  );
}
