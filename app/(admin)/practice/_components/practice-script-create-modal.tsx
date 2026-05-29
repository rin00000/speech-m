"use client";

/**
 * 관리자용 새 연습 원고 등록 모달.
 * 등록 서버 액션과 제출 로딩 상태를 모달 내부에서 관리한다.
 */

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { addPracticeScript } from "../actions";

export const PracticeScriptCreateModal = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">🎙️ 새 원고 등록</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <HugeiconsIcon icon={Cancel01Icon} size={24} color="currentColor" />
          </button>
        </div>

        <form
          action={async (formData) => {
            setIsSubmitting(true);
            try {
              const res = await addPracticeScript(formData);
              if (res.success) {
                onClose();
              } else {
                alert(res.error || "원고 저장에 실패했습니다.");
              }
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700">카테고리</label>
              <select
                name="category"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
              >
                <option value="practice">핵심 연습용 (Practice)</option>
                <option value="portfolio">명품 포트폴리오 (Portfolio)</option>
                <option value="designated">지정원고 (Designated)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700">분야 (예: 뉴스, 기상캐스터)</label>
              <input
                type="text"
                name="type"
                required
                placeholder="뉴스 대본"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-700">제목</label>
            <input
              type="text"
              name="title"
              required
              placeholder="예) KBS 정오 뉴스 - 수도권 집중호우 속보"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700">난이도</label>
              <select
                name="difficulty"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
              >
                <option value="쉬움">쉬움</option>
                <option value="보통">보통</option>
                <option value="어려움">어려움</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700">원포인트 팁 (설명)</label>
              <input
                type="text"
                name="description"
                placeholder="발음이 꼬이기 쉬운..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500"
              />
            </div>
          </div>

          <div className="flex-1 min-h-[200px]">
            <label className="mb-1.5 block text-xs font-bold text-gray-700">원고 내용</label>
            <textarea
              name="content"
              required
              rows={10}
              placeholder="내용을 복사+붙여넣기 하세요."
              className="h-full w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500 font-sans"
            />
          </div>

          <div className="mt-4 flex shrink-0 flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-periwinkle-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-periwinkle-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "저장 중..." : "원고 저장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
