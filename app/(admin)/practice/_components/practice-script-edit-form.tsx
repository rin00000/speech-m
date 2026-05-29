"use client";

/**
 * 선택한 연습 원고를 바로 수정하는 인라인 폼.
 * 저장 서버 액션과 로딩 상태는 폼 내부에서 처리하고 성공 시 상위에 완료를 알린다.
 */

import { useState } from "react";
import { updatePracticeScript } from "../actions";
import type { ScriptItem } from "./practice-list-types";

export const PracticeScriptEditForm = ({
  script,
  onCancel,
  onSaved,
}: {
  script: ScriptItem;
  onCancel: () => void;
  onSaved: () => void;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  return (
    <form
      action={async (formData) => {
        setIsUpdating(true);
        try {
          const res = await updatePracticeScript(script.id, formData);
          if (res.success) {
            onSaved();
          } else {
            alert(res.error || "수정에 실패했습니다.");
          }
        } finally {
          setIsUpdating(false);
        }
      }}
      className="flex flex-col gap-4 flex-1 h-full"
    >
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-1 shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">✏️ 원고 수정</h2>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-gray-700">카테고리</label>
          <select
            name="category"
            defaultValue={script.category}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
          >
            <option value="practice">핵심 연습용 (Practice)</option>
            <option value="portfolio">명품 포트폴리오 (Portfolio)</option>
            <option value="designated">지정원고 (Designated)</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-gray-700">분야</label>
          <input
            type="text"
            name="type"
            required
            defaultValue={script.type}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
          />
        </div>
      </div>

      <div className="shrink-0">
        <label className="mb-1.5 block text-xs font-bold text-gray-700">제목</label>
        <input
          type="text"
          name="title"
          required
          defaultValue={script.title}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
        />
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-gray-700">난이도</label>
          <select
            name="difficulty"
            defaultValue={script.difficulty}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
          >
            <option value="쉬움">쉬움</option>
            <option value="보통">보통</option>
            <option value="어려움">어려움</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-gray-700">원포인트 팁</label>
          <input
            type="text"
            name="description"
            defaultValue={script.description}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-[250px]">
        <label className="mb-1.5 block text-xs font-bold text-gray-700">원고 내용</label>
        <textarea
          name="content"
          required
          defaultValue={script.content}
          className="flex-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500 font-sans"
        />
      </div>

      <div className="mt-4 flex shrink-0 flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isUpdating}
          className="rounded-xl bg-periwinkle-600 px-6 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-periwinkle-700 disabled:opacity-50"
        >
          {isUpdating ? "저장 중..." : "수정 완료"}
        </button>
      </div>
    </form>
  );
};
