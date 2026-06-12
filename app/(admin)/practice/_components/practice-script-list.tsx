"use client";

/**
 * 선택된 카테고리의 원고 카드 목록.
 * 원고 선택 상태와 빈 목록 메시지를 표시한다.
 */

import type { ScriptItem } from "./practice-list-types";
import { EmptyState } from "@/components/ui/empty-state";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookOpen01Icon } from "@hugeicons/core-free-icons";

export const PracticeScriptList = ({
  scripts,
  selectedScriptId,
  onSelect,
}: {
  scripts: ScriptItem[];
  selectedScriptId: string | null;
  onSelect: (id: string) => void;
}) => {
  if (scripts.length === 0) {
    return (
      <EmptyState
        icon={<HugeiconsIcon icon={BookOpen01Icon} size={28} color="currentColor" />}
        title="등록된 연습 원고가 없습니다"
        description="새 원고를 등록하면 목록에 표시됩니다."
        className="min-h-48 bg-white"
      />
    );
  }

  return (
    <div className="space-y-2">
      {scripts.map((script) => {
        const isSelected = script.id === selectedScriptId;
        return (
          <button
            type="button"
            key={script.id}
            onClick={() => onSelect(script.id)}
            className={`group relative w-full rounded-2xl border p-3 text-left transition-colors ${
              isSelected
                ? "border-periwinkle-300 bg-periwinkle-50/70"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span
              className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${
                isSelected ? "bg-periwinkle-600" : "bg-transparent"
              }`}
            />
            <h3
              className={`line-clamp-2 pr-1 text-sm font-extrabold leading-snug transition-colors ${
                isSelected ? "text-periwinkle-800" : "text-gray-800 group-hover:text-periwinkle-600"
              }`}
            >
              {script.title}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold leading-none text-gray-500">
              <span>{script.type}</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>{script.difficulty}</span>
            </p>
          </button>
        );
      })}
    </div>
  );
};
