"use client";

/**
 * 선택한 원고의 읽기 화면과 관리자 수정/삭제 액션 영역.
 * 편집 모드가 켜지면 인라인 수정 폼을 렌더링한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { BookOpen01Icon, Delete01Icon, FileEditIcon } from "@hugeicons/core-free-icons";
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
    <div className="flex min-h-[420px] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm md:min-h-[500px] md:rounded-3xl">
      {script ? (
        <div className="flex flex-1 flex-col">
          {isEditing ? (
            <div className="flex flex-1 flex-col p-4 md:p-6">
              <PracticeScriptEditForm script={script} onCancel={onCancelEdit} onSaved={onSaved} />
            </div>
          ) : (
            <>
              <div className="border-b border-gray-100 p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-bold leading-none text-gray-500">
                      <span>{script.type}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-300" />
                      <span>{script.difficulty}</span>
                    </p>
                    <h2 className="mt-2 text-lg font-extrabold leading-snug text-gray-900 md:text-xl">
                      {script.title}
                    </h2>
                    {script.description && (
                      <p className="mt-2 text-xs font-medium leading-snug text-gray-500">
                        {script.description}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={onEdit}
                        title="원고 수정"
                        aria-label="원고 수정"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
                      >
                        <HugeiconsIcon icon={FileEditIcon} size={16} color="currentColor" />
                      </button>
                      <button
                        type="button"
                        onClick={onDelete}
                        disabled={isDeleting}
                        title="원고 삭제"
                        aria-label="원고 삭제"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <HugeiconsIcon icon={Delete01Icon} size={16} color="currentColor" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 md:p-6">
                <pre className="min-h-[300px] whitespace-pre-wrap break-words rounded-2xl border border-gray-100 bg-gray-50/80 p-4 font-sans text-sm font-medium leading-[1.8] text-gray-800 select-all md:p-6 md:text-base">
                  {script.content}
                </pre>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-grow flex-col items-center justify-center p-8 text-center">
          <span className="text-gray-300">
            <HugeiconsIcon icon={BookOpen01Icon} size={48} color="currentColor" />
          </span>
          <p className="mt-4 text-sm font-semibold text-gray-500">선택된 원고가 없습니다.</p>
        </div>
      )}
    </div>
  );
};
