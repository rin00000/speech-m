"use client";

/**
 * 연습실 좌측 상단의 원고 카테고리 탭과 관리자 등록 버튼.
 * 카테고리 선택 시 어떤 원고를 열지는 상위 PracticeListView가 결정한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  SparklesIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import type { PracticeCategory } from "./practice-list-types";

const categoryTabs = [
  { id: "practice", label: "🎙️ 연습용", icon: Task01Icon },
  { id: "portfolio", label: "📁 포트폴리오용", icon: SparklesIcon },
  { id: "designated", label: "📌 지정원고", icon: Task01Icon },
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
      <div className="flex flex-1 overflow-x-auto rounded-2xl border border-gray-200 bg-gray-100 p-1">
        {categoryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onCategoryChange(tab.id)}
            className={`flex min-w-28 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-extrabold transition-all ${
              activeCategory === tab.id
                ? "bg-white text-periwinkle-700 shadow-sm"
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
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-periwinkle-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-periwinkle-700 active:scale-95"
        >
          <HugeiconsIcon icon={Add01Icon} size={16} color="currentColor" />
          <span>등록</span>
        </button>
      )}
    </div>
  );
};
