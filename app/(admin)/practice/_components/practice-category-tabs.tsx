"use client";

/**
 * 연습실 좌측 상단의 원고 카테고리 탭과 관리자 등록 버튼.
 * 카테고리 선택 시 어떤 원고를 열지는 상위 PracticeListView가 결정한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  FileEditIcon,
  SparklesIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import type { PracticeCategory } from "./practice-list-types";

const categoryTabs = [
  { id: "practice", label: "연습용", icon: FileEditIcon },
  { id: "portfolio", label: "포트폴리오", icon: SparklesIcon },
  { id: "designated", label: "지정원고", icon: Task01Icon },
] satisfies Array<{
  id: PracticeCategory;
  label: string;
  icon: typeof Task01Icon;
}>;

export const PracticeCategoryTabs = ({
  activeCategory,
  isAdmin,
  onCategoryChange,
  onOpenCreateModal,
}: {
  activeCategory: PracticeCategory;
  isAdmin?: boolean;
  onCategoryChange: (category: PracticeCategory) => void;
  onOpenCreateModal: () => void;
}) => {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-1 overflow-x-auto rounded-full border border-gray-200 bg-white p-1 shadow-sm">
        {categoryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onCategoryChange(tab.id)}
            aria-pressed={activeCategory === tab.id}
            className={`flex min-w-24 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold transition-colors ${
              activeCategory === tab.id
                ? "bg-periwinkle-600 text-white"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <HugeiconsIcon icon={tab.icon} size={14} color="currentColor" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      {isAdmin && (
        <button
          onClick={onOpenCreateModal}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-periwinkle-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-periwinkle-700"
        >
          <HugeiconsIcon icon={Add01Icon} size={16} color="currentColor" />
          <span>새 원고</span>
        </button>
      )}
    </div>
  );
};
