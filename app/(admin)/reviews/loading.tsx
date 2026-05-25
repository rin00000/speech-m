/**
 * 시험 후기 페이지 로딩 스켈레톤.
 * 헤더 + 컨텐츠 카드 영역 뼈대 UI.
 */

import {
  Skeleton,
  SkeletonLine,
  SkeletonPageHeader,
} from "@/components/ui/skeleton";

export default function ReviewsLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonPageHeader />

      <div className="flex-1 p-6">
        {/* 배지 영역 */}
        <Skeleton className="mb-5 h-7 w-48 rounded-full" />

        {/* 콘텐츠 카드 */}
        <div className="rounded-3xl border border-gray-200 bg-white py-12 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <SkeletonLine size="sm" width="1/3" />
              <SkeletonLine size="xs" width="1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
