"use client";

/**
 * 공고 테이블 상단의 검색, 일괄 액션, 밀도 전환 UI.
 * 선택 상태와 액션 핸들러는 상위 JobsTable에서 받아 순수하게 표시한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete01Icon,
  JobShareIcon,
  MultiplicationSignIcon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import type { JobStatus } from "@/types/database.types";
import type { JobsTableDensity } from "./jobs-table-types";

export const JobsTableToolbar = ({
  query,
  visibleStart,
  visibleEnd,
  filteredCount,
  activeCount,
  selectedCount,
  selectionAllRejected,
  isBulkPending,
  density,
  onQueryChange,
  onBulkStatus,
  onBulkPublish,
  onBulkDeleteRejected,
  onClearSelection,
  onDensityChange,
}: {
  query: string;
  visibleStart: number;
  visibleEnd: number;
  filteredCount: number;
  activeCount: number;
  selectedCount: number;
  selectionAllRejected: boolean;
  isBulkPending: boolean;
  density: JobsTableDensity;
  onQueryChange: (value: string) => void;
  onBulkStatus: (status: JobStatus) => void;
  onBulkPublish: () => void;
  onBulkDeleteRejected: () => void;
  onClearSelection: () => void;
  onDensityChange: (density: JobsTableDensity) => void;
}) => {
  const toolbarButtonClass =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none transition-colors";

  return (
    <>
      <div className="relative w-full md:max-w-xs md:flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-gray-400">
          <HugeiconsIcon icon={Search01Icon} size={14} color="currentColor" strokeWidth={2} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="공고명 또는 회사명 검색…"
          className="w-full rounded-full border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-periwinkle-400 focus:outline-none focus:ring-2 focus:ring-periwinkle-100"
        />
      </div>

      {selectedCount > 0 && (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-1">
          <span className="text-sm font-medium text-gray-700">{selectedCount}개 선택됨</span>
          <div className="hidden h-3.5 w-px bg-gray-200 md:block" />
          <button
            onClick={() => onBulkStatus("approved")}
            disabled={isBulkPending}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-medium leading-none text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:py-1.5"
          >
            <HugeiconsIcon icon={Tick02Icon} size={13} color="currentColor" strokeWidth={2} />
            일괄 승인
          </button>
          <button
            onClick={() => onBulkStatus("rejected")}
            disabled={isBulkPending}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500 px-3 py-2 text-xs font-medium leading-none text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:py-1.5"
          >
            <HugeiconsIcon icon={Delete01Icon} size={13} color="currentColor" strokeWidth={2} />
            일괄 거절
          </button>
          {selectionAllRejected && (
            <button
              type="button"
              onClick={() => void onBulkDeleteRejected()}
              disabled={isBulkPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-300 bg-white px-3 py-2 text-xs font-medium leading-none text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:py-1.5"
            >
              <HugeiconsIcon icon={Delete01Icon} size={13} color="currentColor" strokeWidth={2} />
              선택 거절 삭제
            </button>
          )}
          <button
            onClick={onBulkPublish}
            disabled={isBulkPending}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-periwinkle-200 bg-periwinkle-100 px-3 py-2 text-xs font-medium leading-none text-periwinkle-700 transition-colors hover:bg-periwinkle-200 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:py-1.5"
          >
            <HugeiconsIcon icon={JobShareIcon} size={13} color="currentColor" strokeWidth={2} />
            일괄 내부 게시
          </button>
          <button
            onClick={onClearSelection}
            disabled={isBulkPending}
            className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600 md:ml-auto"
          >
            <HugeiconsIcon icon={MultiplicationSignIcon} size={12} color="currentColor" strokeWidth={2} />
            선택 해제
          </button>
        </div>
      )}

      {selectedCount === 0 && (
        <span className="text-xs text-gray-400 tabular-nums md:ml-auto">
          {visibleStart}-{visibleEnd} / {filteredCount}건
          {query && activeCount !== filteredCount && ` / 전체 ${activeCount}건`}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1" role="group" aria-label="표 밀도">
        <button
          type="button"
          aria-pressed={density === "compact"}
          title="행 간격을 좁혀 한 화면에 더 많이 표시"
          onClick={() => onDensityChange("compact")}
          className={`${toolbarButtonClass} ${
            density === "compact"
              ? "border-gray-300 bg-white text-gray-700"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          촘촘함
        </button>
        <button
          type="button"
          aria-pressed={density === "comfortable"}
          title="행 간격을 넓혀 가독성을 높임"
          onClick={() => onDensityChange("comfortable")}
          className={`${toolbarButtonClass} ${
            density === "comfortable"
              ? "border-gray-300 bg-white text-gray-700"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          여유
        </button>
      </div>
    </>
  );
};
