/**
 * 대시보드 페이지 로딩 스켈레톤.
 * 서버 컴포넌트 데이터 패칭 중 표시되는 뼈대 UI.
 * StudyProgressDashboard, CrawlerControlHub, 공고 목록 영역을 반영.
 */

import {
  Skeleton,
  SkeletonCard,
  SkeletonLine,
  SkeletonPageHeader,
} from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonPageHeader />

      <div className="flex-1 space-y-6 p-6">
        {/* StudyProgressDashboard + CrawlerControlHub 그리드 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* StudyProgressDashboard 스켈레톤 */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="space-y-1.5">
                <SkeletonLine size="sm" width="1/3" />
                <SkeletonLine size="xs" width="1/2" />
              </div>
            </div>
            {/* 지표 요약 스켈레톤 */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <SkeletonLine size="xs" width="1/2" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="mt-3 h-5 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-3/4" />
                </div>
              ))}
            </div>
            {/* 진행률/퀘스트 스켈레톤 */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          </div>

          {/* CrawlerControlHub 스켈레톤 */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="space-y-1.5">
                <SkeletonLine size="sm" width="1/2" />
                <SkeletonLine size="xs" width="3/4" />
              </div>
            </div>
            {/* stat 요약 */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
            {/* 소스 리스트 */}
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl border border-gray-100 p-3">
                  <div className="space-y-1">
                    <SkeletonLine size="sm" width="1/2" />
                    <SkeletonLine size="xs" width="1/3" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ))}
            </div>
            {/* AI 버튼 */}
            <Skeleton className="mt-4 h-10 w-full rounded-full" />
          </div>
        </div>

        {/* 최근 내부 게시 공고 카드 */}
        <SkeletonCard lines={4} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm" />
      </div>
    </div>
  );
}
