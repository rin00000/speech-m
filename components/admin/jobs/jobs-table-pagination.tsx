"use client";

/**
 * 공고 테이블 하단 페이지네이션과 현재 범위 표시.
 * 페이지 변경 로직은 상위에서 받고, 이 컴포넌트는 버튼 상태만 결정한다.
 */

export const JobsTablePagination = ({
  visibleStart,
  visibleEnd,
  filteredCount,
  activeCount,
  query,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: {
  visibleStart: number;
  visibleEnd: number;
  filteredCount: number;
  activeCount: number;
  query: string;
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  return (
    <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-gray-500 tabular-nums">
        {visibleStart}-{visibleEnd} / {filteredCount}건
        {query && activeCount !== filteredCount ? ` (전체 ${activeCount}건)` : ""}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage <= 1}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전
        </button>
        <span className="min-w-16 text-center text-xs font-semibold text-gray-700 tabular-nums">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
};
