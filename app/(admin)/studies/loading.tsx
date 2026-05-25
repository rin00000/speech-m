/**
 * 스터디 관리 페이지 로딩 스켈레톤.
 * 헤더 + 빈 상태 카드 영역 뼈대 UI.
 */

import {
  Skeleton,
  SkeletonLine,
  SkeletonPageHeader,
} from "@/components/ui/skeleton";

export default function StudiesLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonPageHeader />

      <div className="flex-1 p-6">
        <SkeletonLine size="sm" width="3/4" />

        <div className="mt-5 rounded-3xl border border-gray-200 bg-white py-12 shadow-sm">
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
