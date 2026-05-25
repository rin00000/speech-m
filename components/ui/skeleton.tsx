/**
 * 공통 스켈레톤 UI 컴포넌트 모음.
 * 페이지 로딩 중 뼈대 UI를 표시하기 위한 재사용 가능한 primitive.
 * shimmer 애니메이션 적용, periwinkle 계열 톤으로 브랜드 통일성 유지.
 * 각 페이지의 loading.tsx에서 조합하여 사용한다.
 */

import { cn } from "@/lib/ui/cn";

/** 기본 shimmer 스켈레톤 블록 */
export const Skeleton = ({
  className,
}: {
  className?: string;
}) => (
  <div
    className={cn(
      "animate-pulse rounded-lg bg-gray-100",
      className,
    )}
  />
);

/** 텍스트 한 줄 스켈레톤 */
export const SkeletonLine = ({
  width = "full",
  size = "sm",
}: {
  width?: "full" | "3/4" | "1/2" | "1/3" | "1/4";
  size?: "xs" | "sm" | "md";
}) => {
  const widthMap = {
    full: "w-full",
    "3/4": "w-3/4",
    "1/2": "w-1/2",
    "1/3": "w-1/3",
    "1/4": "w-1/4",
  };
  const sizeMap = {
    xs: "h-3",
    sm: "h-4",
    md: "h-5",
  };
  return (
    <Skeleton className={cn(widthMap[width], sizeMap[size])} />
  );
};

/** 카드형 스켈레톤 (제목 + 설명 라인) */
export const SkeletonCard = ({
  className,
  lines = 2,
}: {
  className?: string;
  lines?: number;
}) => (
  <div
    className={cn(
      "rounded-3xl border border-gray-100 bg-white p-5 shadow-sm",
      className,
    )}
  >
    <SkeletonLine size="md" width="1/2" />
    <div className="mt-3 space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i % 2 === 0 ? "full" : "3/4"} size="sm" />
      ))}
    </div>
  </div>
);

/** 통계 수치 카드 스켈레톤 */
export const SkeletonStatCard = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-sm",
      className,
    )}
  >
    <div className="absolute left-0 top-0 h-full w-1 animate-pulse rounded-l-xl bg-gray-200" />
    <div className="flex items-center justify-between pl-2">
      <div className="space-y-2">
        <SkeletonLine size="xs" width="1/3" />
        <Skeleton className="h-8 w-12" />
      </div>
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
  </div>
);

/** 테이블 행 스켈레톤 */
export const SkeletonTableRow = ({ cols = 6 }: { cols?: number }) => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-3 py-3">
        <SkeletonLine
          width={i === 0 ? "3/4" : i === cols - 1 ? "1/4" : "full"}
          size="sm"
        />
      </td>
    ))}
  </tr>
);

/** 테이블 전체 스켈레톤 */
export const SkeletonTable = ({
  rows = 8,
  cols = 6,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) => (
  <div
    className={cn(
      "overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm",
      className,
    )}
  >
    {/* 테이블 헤더 영역 스켈레톤 */}
    <div className="border-b border-gray-200 bg-gray-50/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48 rounded-full" />
        <Skeleton className="ml-auto h-6 w-16 rounded-full" />
      </div>
    </div>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-3 py-2.5">
              <SkeletonLine size="xs" width={i === 0 ? "1/2" : "full"} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  </div>
);

/** 헤더 영역 스켈레톤 */
export const SkeletonPageHeader = () => (
  <div className="flex h-16 shrink-0 items-center border-b border-gray-200 bg-white px-4 sm:px-6">
    <div className="space-y-1.5">
      <SkeletonLine size="md" width="1/3" />
      <SkeletonLine size="xs" width="1/2" />
    </div>
  </div>
);

/** 액션 버튼 영역 스켈레톤 */
export const SkeletonActionBar = ({ count = 3 }: { count?: number }) => (
  <div className="flex flex-wrap items-center gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-8 w-28 rounded-full" />
    ))}
  </div>
);

/** 범용 페이지 스켈레톤 (로딩 전환 시 즉시 노출용) */
export const SkeletonPage = () => (
  <div className="flex flex-1 flex-col animate-fadeIn bg-gray-50/50">
    {/* 헤더 스켈레톤 */}
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 shadow-sm">
      <div className="space-y-1.5 w-1/3">
        <Skeleton className="h-5 w-3/4 rounded-full" />
        <Skeleton className="h-3 w-1/2 rounded-full" />
      </div>
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>

    {/* 본문 콘텐츠 스크롤 영역 스켈레톤 */}
    <div className="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6">
      {/* 통계 카드 그리드 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* 액션바 & 필터 영역 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <SkeletonActionBar count={3} />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>

      {/* 메인 테이블/그리드 스켈레톤 */}
      <SkeletonTable rows={6} cols={5} />
    </div>
  </div>
);

