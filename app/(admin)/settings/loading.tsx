/**
 * 시스템 통합 설정 페이지 로딩 스켈레톤.
 * 헤더 + 설정 섹션 카드들의 뼈대 UI.
 */

import {
  Skeleton,
  SkeletonLine,
  SkeletonPageHeader,
} from "@/components/ui/skeleton";

const SkeletonSettingSection = ({ rows = 3 }: { rows?: number }) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-4 flex items-center gap-2">
      <Skeleton className="h-6 w-6 rounded-lg" />
      <SkeletonLine size="sm" width="1/4" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
          <div className="space-y-1.5 flex-1">
            <SkeletonLine size="sm" width="1/3" />
            <SkeletonLine size="xs" width="1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

export default function SettingsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkeletonPageHeader />

      <div className="flex-1 p-6">
        {/* 사용자 프로필 카드 */}
        <div className="mb-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <SkeletonLine size="md" width="1/4" />
              <SkeletonLine size="xs" width="1/3" />
            </div>
          </div>
        </div>

        {/* 설정 섹션들 */}
        <div className="space-y-4">
          <SkeletonSettingSection rows={3} />
          <SkeletonSettingSection rows={4} />
          <SkeletonSettingSection rows={2} />
        </div>
      </div>
    </div>
  );
}
