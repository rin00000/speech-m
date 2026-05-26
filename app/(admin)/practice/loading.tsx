/**
 * 수강생 원고 연습실 페이지 로딩 스켈레톤.
 * 헤더 + 원고 목록 카드 뼈대 UI.
 */

import {
  Skeleton,
  SkeletonLine,
  SkeletonPageHeader,
} from "@/components/ui/skeleton";

export default function PracticeLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkeletonPageHeader />

      <div className="flex-1 p-6">
        {/* 필터 탭 스켈레톤 */}
        <div className="mb-4 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>

        {/* 원고 카드 그리드 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <SkeletonLine size="md" width="full" />
                  <SkeletonLine size="sm" width="3/4" />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <SkeletonLine size="xs" width="full" />
                <SkeletonLine size="xs" width="3/4" />
              </div>
              <Skeleton className="mt-4 h-9 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
