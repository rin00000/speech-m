/**
 * 대시보드 페이지 로딩 스켈레톤.
 * 서버 컴포넌트 데이터 패칭 중 표시되는 뼈대 UI.
 * CrawlerControlHub, RelayFeedbackConsole, 공고 목록 영역을 반영.
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
        {/* CrawlerControlHub + RelayFeedbackConsole 그리드 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* RelayFeedbackConsole 스켈레톤 */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="space-y-1.5">
                <SkeletonLine size="sm" width="1/3" />
                <SkeletonLine size="xs" width="1/2" />
              </div>
            </div>
            {/* 메시지 목록 스켈레톤 */}
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine size="sm" width="3/4" />
                    <SkeletonLine size="xs" width="full" />
                    <SkeletonLine size="xs" width="1/2" />
                  </div>
                </div>
              ))}
            </div>
            {/* 입력창 스켈레톤 */}
            <Skeleton className="mt-4 h-20 w-full rounded-2xl" />
            <Skeleton className="mt-2 ml-auto h-8 w-24 rounded-full" />
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
