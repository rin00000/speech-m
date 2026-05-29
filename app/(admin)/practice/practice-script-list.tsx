"use client";

/**
 * 선택된 카테고리의 원고 카드 목록.
 * 원고 선택 상태와 빈 목록 메시지를 표시한다.
 */

import type { ScriptItem } from "./practice-list-types";

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
      <div className="py-8 text-center text-sm font-semibold text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
        등록된 원고가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scripts.map((script) => {
        const isSelected = script.id === selectedScriptId;
        return (
          <div
            key={script.id}
            onClick={() => onSelect(script.id)}
            className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
              isSelected
                ? "border-periwinkle-500 bg-periwinkle-50/50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-block rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                {script.type}
              </span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                  script.difficulty === "어려움"
                    ? "bg-red-50 text-red-500"
                    : script.difficulty === "보통"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-emerald-50 text-emerald-600"
                }`}
              >
                난이도: {script.difficulty}
              </span>
            </div>

            <h3
              className={`mt-3 text-sm font-extrabold leading-snug transition-colors ${
                isSelected ? "text-periwinkle-800" : "text-gray-800 group-hover:text-periwinkle-600"
              }`}
            >
              {script.title}
            </h3>

            <p className="mt-1.5 text-xs text-gray-400 font-medium line-clamp-2 leading-relaxed">
              {script.description}
            </p>

            <div className="mt-4 flex items-center justify-end text-[11px] font-semibold text-gray-400">
              {isSelected && (
                <span className="text-periwinkle-600 font-bold flex items-center gap-0.5 animate-pulse">
                  열람 중
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
