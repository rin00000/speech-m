"use client";

import { useState } from "react";
import type { ScriptItem } from "./page";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  SparklesIcon,
  Task01Icon,
  Add01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { addPracticeScript, updatePracticeScript, deletePracticeScript } from "@/app/actions/practice";

export function PracticeListView({
  scripts,
  isAdmin,
}: {
  scripts: ScriptItem[];
  isAdmin?: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<"practice" | "portfolio" | "designated">("practice");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(scripts[0]?.id ?? null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = scripts.filter((s) => s.category === activeCategory);
  const effectiveSelectedScriptId = selectedScriptId ?? filtered[0]?.id ?? null;
  const selectedScript = scripts.find((s) => s.id === effectiveSelectedScriptId);
  const selectScript = (id: string | null) => {
    setSelectedScriptId(id);
    setIsEditing(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_1.3fr]">
        {/* Left panel - Navigation and script list */}
        <div className="space-y-6">
          {/* Category switcher tabs & Upload Button */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 rounded-2xl bg-gray-100 p-1 border border-gray-200">
              <button
                onClick={() => {
                  setActiveCategory("practice");
                  const sub = scripts.find((s) => s.category === "practice");
                  selectScript(sub?.id ?? null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  activeCategory === "practice"
                    ? "bg-white text-periwinkle-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <HugeiconsIcon icon={Task01Icon} size={14} color="currentColor" />
                <span>🎙️ 핵심 연습용</span>
              </button>
              <button
                onClick={() => {
                  setActiveCategory("portfolio");
                  const sub = scripts.find((s) => s.category === "portfolio");
                  selectScript(sub?.id ?? null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  activeCategory === "portfolio"
                    ? "bg-white text-periwinkle-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <HugeiconsIcon icon={SparklesIcon} size={14} color="currentColor" />
                <span>📁 명품 포트폴리오</span>
              </button>
              <button
                onClick={() => {
                  setActiveCategory("designated");
                  const sub = scripts.find((s) => s.category === "designated");
                  selectScript(sub?.id ?? null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  activeCategory === "designated"
                    ? "bg-white text-periwinkle-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <HugeiconsIcon icon={Task01Icon} size={14} color="currentColor" />
                <span>📌 지정원고</span>
              </button>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="shrink-0 flex items-center justify-center gap-1.5 rounded-2xl bg-periwinkle-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-periwinkle-700 active:scale-95"
              >
                <HugeiconsIcon icon={Add01Icon} size={16} color="currentColor" />
                <span>등록</span>
              </button>
            )}
          </div>

          {/* Script Cards List */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                등록된 원고가 없습니다.
              </div>
            ) : (
              filtered.map((script) => {
                const isSelected = script.id === effectiveSelectedScriptId;
                return (
                  <div
                    key={script.id}
                    onClick={() => selectScript(script.id)}
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
              })
            )}
          </div>
        </div>

        {/* Right panel - Script Reader */}
        <div className="flex min-h-[500px] flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          {selectedScript ? (
            <div className="flex-1 flex flex-col">
              {isEditing ? (
                // --- INLINE EDIT FORM ---
                <form
                  action={async (formData) => {
                    setIsUpdating(true);
                    try {
                      const res = await updatePracticeScript(selectedScript.id, formData);
                      if (res.success) {
                        setIsEditing(false);
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
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      ✏️ 원고 수정
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 shrink-0">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700">카테고리</label>
                      <select name="category" defaultValue={selectedScript.category} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500">
                        <option value="practice">핵심 연습용 (Practice)</option>
                        <option value="portfolio">명품 포트폴리오 (Portfolio)</option>
                        <option value="designated">지정원고 (Designated)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700">분야</label>
                      <input type="text" name="type" required defaultValue={selectedScript.type} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500" />
                    </div>
                  </div>

                  <div className="shrink-0">
                    <label className="mb-1.5 block text-xs font-bold text-gray-700">제목</label>
                    <input type="text" name="title" required defaultValue={selectedScript.title} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 shrink-0">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700">난이도</label>
                      <select name="difficulty" defaultValue={selectedScript.difficulty} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500">
                        <option value="쉬움">쉬움</option>
                        <option value="보통">보통</option>
                        <option value="어려움">어려움</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700">원포인트 팁</label>
                      <input type="text" name="description" defaultValue={selectedScript.description} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500" />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-[250px]">
                    <label className="mb-1.5 block text-xs font-bold text-gray-700">원고 내용</label>
                    <textarea name="content" required defaultValue={selectedScript.content} className="flex-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500 font-sans"></textarea>
                  </div>

                  <div className="mt-4 flex justify-end gap-2 shrink-0 border-t border-gray-100 pt-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                      취소
                    </button>
                    <button type="submit" disabled={isUpdating} className="rounded-xl bg-periwinkle-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-periwinkle-700 disabled:opacity-50 transition-colors">
                      {isUpdating ? "저장 중..." : "수정 완료"}
                    </button>
                  </div>
                </form>
              ) : (
                // --- READ ONLY VIEW ---
                <>
                  {/* Header info */}
                  <div className="border-b border-gray-100 pb-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-periwinkle-50 px-2.5 py-0.5 text-xs font-bold text-periwinkle-700">
                            {selectedScript.type}
                          </span>
                          <span className="text-xs font-semibold text-gray-400">
                            난이도: {selectedScript.difficulty}
                          </span>
                        </div>
                        <h2 className="mt-3 text-lg md:text-xl font-extrabold text-gray-900 leading-snug">
                          {selectedScript.title}
                        </h2>
                        <p className="mt-1 text-xs text-gray-400 leading-tight">
                          {selectedScript.description}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => setIsEditing(true)}
                            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
                          >
                            수정
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("정말로 이 원고를 삭제하시겠습니까?")) {
                                setIsDeleting(true);
                                try {
                                  const res = await deletePracticeScript(selectedScript.id);
                                  if (res.success) {
                                    selectScript(null);
                                  } else {
                                    alert(res.error || "삭제에 실패했습니다.");
                                  }
                                } finally {
                                  setIsDeleting(false);
                                }
                              }
                            }}
                            disabled={isDeleting}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            {isDeleting ? "삭제 중..." : "삭제"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Script content view */}
                  <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-6 md:p-8">
                    <pre className="whitespace-pre-wrap font-sans text-sm md:text-base font-medium leading-[1.8] text-gray-800 tracking-wide select-all">
                      {selectedScript.content}
                    </pre>
                  </div>

                  {/* Footer tips */}
                  <div className="mt-6 flex gap-3 rounded-2xl bg-periwinkle-50/50 p-4 border border-periwinkle-100/50">
                    <span className="text-periwinkle-600 shrink-0 mt-0.5">
                      <HugeiconsIcon icon={BookOpen01Icon} size={16} color="currentColor" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-periwinkle-800">💡 원장님의 원포인트 레슨</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-periwinkle-700 font-medium">
                        {selectedScript.difficulty === "어려움"
                          ? "중간중간 포함된 복잡한 숫자 표기와 고난도 전문 어휘들은 소리 내어 3번 이상 반복 연습하세요. 호흡 배분이 승부처입니다."
                          : selectedScript.difficulty === "보통"
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
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                🎙️ 새 원고 등록
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <HugeiconsIcon icon={Cancel01Icon} size={24} color="currentColor" />
              </button>
            </div>
            
            <form 
              action={async (formData) => {
                setIsSubmitting(true);
                try {
                  const res = await addPracticeScript(formData);
                  if (res.success) {
                    setIsModalOpen(false);
                  } else {
                    alert(res.error || "원고 저장에 실패했습니다.");
                  }
                } finally {
                  setIsSubmitting(false);
                }
              }} 
              className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">카테고리</label>
                  <select name="category" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500">
                    <option value="practice">핵심 연습용 (Practice)</option>
                    <option value="portfolio">명품 포트폴리오 (Portfolio)</option>
                    <option value="designated">지정원고 (Designated)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">분야 (예: 뉴스, 기상캐스터)</label>
                  <input type="text" name="type" required placeholder="뉴스 대본" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700">제목</label>
                <input type="text" name="title" required placeholder="예) KBS 정오 뉴스 - 수도권 집중호우 속보" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">난이도</label>
                  <select name="difficulty" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500">
                    <option value="쉬움">쉬움</option>
                    <option value="보통">보통</option>
                    <option value="어려움">어려움</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">원포인트 팁 (설명)</label>
                  <input type="text" name="description" placeholder="발음이 꼬이기 쉬운..." className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500" />
                </div>
              </div>

              <div className="flex-1 min-h-[200px]">
                <label className="mb-1.5 block text-xs font-bold text-gray-700">원고 내용</label>
                <textarea name="content" required rows={10} placeholder="내용을 복사+붙여넣기 하세요." className="h-full w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-periwinkle-500 focus:outline-none focus:ring-1 focus:ring-periwinkle-500 font-sans"></textarea>
              </div>

              <div className="mt-4 flex justify-end gap-2 shrink-0 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                  취소
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-xl bg-periwinkle-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-periwinkle-700 disabled:opacity-50 transition-colors">
                  {isSubmitting ? "저장 중..." : "원고 저장하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
