"use client";

/**
 * 선택한 원고의 읽기 화면과 관리자 수정/삭제 액션 영역.
 * 편집 모드가 켜지면 인라인 수정 폼을 렌더링한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { BookOpen01Icon } from "@hugeicons/core-free-icons";
import { PracticeScriptEditForm } from "./practice-script-edit-form";
import type { ScriptItem } from "./practice-list-types";

export const PracticeScriptReader = ({
  script,
  isAdmin,
  isEditing,
  isDeleting,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
}: {
  script: ScriptItem | undefined;
  isAdmin?: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) => {
  return (
    <div className="flex min-h-[420px] flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:min-h-[500px] md:rounded-3xl md:p-6">
      {script ? (
        <div className="flex-1 flex flex-col">
          {isEditing ? (
            <PracticeScriptEditForm script={script} onCancel={onCancelEdit} onSaved={onSaved} />
          ) : (
            <>
              <div className="border-b border-gray-100 pb-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-periwinkle-50 px-2.5 py-0.5 text-xs font-bold text-periwinkle-700">
                        {script.type}
                      </span>
                      <span className="text-xs font-semibold text-gray-400">
                        난이도: {script.difficulty}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg md:text-xl font-extrabold text-gray-900 leading-snug">
                      {script.title}
                    </h2>
                    <p className="mt-1 text-xs text-gray-400 leading-tight">{script.description}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 gap-2 sm:justify-end">
                      <button
                        onClick={onEdit}
                        className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        수정
                      </button>
                      <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                      >
                        {isDeleting ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:mt-6 md:p-8">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm font-medium leading-[1.8] text-gray-800 tracking-wide select-all md:text-base">
                  {script.content}
                </pre>
              </div>

              <div className="mt-5 flex gap-3 rounded-2xl border border-periwinkle-100/50 bg-periwinkle-50/50 p-4 md:mt-6">
                <span className="text-periwinkle-600 shrink-0 mt-0.5">
                  <HugeiconsIcon icon={BookOpen01Icon} size={16} color="currentColor" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-periwinkle-800">💡 원장님의 원포인트 레슨</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-periwinkle-700 font-medium">
                    {script.difficulty === "어려움"
                      ? "중간중간 포함된 복잡한 숫자 표기와 고난도 전문 어휘들은 소리 내어 3번 이상 반복 연습하세요. 호흡 배분이 승부처입니다."
                      : script.difficulty === "보통"
                        ? "가장 대중적인 포맷입니다. 기어들어가지 않는 또렷한 발성과 차분하게 팩트를 전달하는 아우라를 풍겨보세요."
                        : "초심자를 위한 기본 대본입니다. 미소 띤 미려한 눈빛과 경쾌한 톤조절, 전달하고자 하는 따스한 마음을 소리에 실어보세요."}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
          <span className="text-gray-300">
            <HugeiconsIcon icon={BookOpen01Icon} size={48} color="currentColor" />
          </span>
          <p className="mt-4 text-sm font-semibold text-gray-500">선택된 원고가 없습니다.</p>
        </div>
      )}
    </div>
  );
};
