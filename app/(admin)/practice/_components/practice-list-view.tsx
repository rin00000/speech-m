"use client";

/**
 * 연습실 원고 목록 화면의 상태 조립 컴포넌트.
 * 카테고리, 선택 원고, 편집/등록 모달 상태를 관리하고 세부 UI는 하위 컴포넌트로 위임한다.
 */

import { useState } from "react";
import { deletePracticeScript } from "../actions";
import { PracticeCategoryTabs } from "./practice-category-tabs";
import { PracticeScriptCreateModal } from "./practice-script-create-modal";
import { PracticeScriptList } from "./practice-script-list";
import { PracticeScriptReader } from "./practice-script-reader";
import type { PracticeCategory, ScriptItem } from "./practice-list-types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  BookOpen01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";

export function PracticeListView({
  scripts,
  isAdmin,
}: {
  scripts: ScriptItem[];
  isAdmin?: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<PracticeCategory>("practice");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReaderFullscreen, setIsReaderFullscreen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const hasScripts = scripts.length > 0;
  const filtered = scripts.filter((script) => script.category === activeCategory);
  const selectedScriptInCategory = filtered.some((script) => script.id === selectedScriptId);
  const effectiveSelectedScriptId = selectedScriptInCategory ? selectedScriptId : null;
  const selectedScript = filtered.find((script) => script.id === effectiveSelectedScriptId);

  const selectScript = (id: string | null) => {
    setSelectedScriptId(id);
    setIsEditing(false);
    setIsReaderFullscreen(false);
  };

  const handleCategoryChange = (category: PracticeCategory) => {
    setActiveCategory(category);
    selectScript(null);
  };

  const handleDeleteSelected = async () => {
    if (!selectedScript) return;
    if (!confirm("정말로 이 원고를 삭제하시겠습니까?")) return;

    setIsDeleting(true);
    setNotice(null);
    try {
      const res = await deletePracticeScript(selectedScript.id);
      if (res.success) {
        setNotice({ tone: "success", text: "원고가 성공적으로 삭제되었습니다." });
        setTimeout(() => setNotice(null), 3000);
        selectScript(null);
        return;
      }
      setNotice({ tone: "error", text: res.error || "원고 삭제에 실패했습니다." });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {notice && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold animate-fadeIn ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <HugeiconsIcon
            icon={notice.tone === "success" ? CheckmarkCircle01Icon : Cancel01Icon}
            size={18}
            color="currentColor"
          />
          <span>{notice.text}</span>
        </div>
      )}
      {hasScripts ? (
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <PracticeCategoryTabs
            activeCategory={activeCategory}
            isAdmin={isAdmin}
            onCategoryChange={handleCategoryChange}
            onOpenCreateModal={() => setIsModalOpen(true)}
          />
          <PracticeScriptList
            scripts={filtered}
            selectedScriptId={effectiveSelectedScriptId}
            onSelect={selectScript}
          />
        </div>
      ) : (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm md:rounded-3xl">
          <div className="max-w-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400">
              <HugeiconsIcon icon={BookOpen01Icon} size={24} color="currentColor" />
            </span>
            <h2 className="mt-4 text-lg font-extrabold text-gray-900">
              등록된 연습 원고가 없습니다
            </h2>
            <p className="mt-2 text-sm font-medium leading-snug text-gray-500">
              {isAdmin
                ? "첫 원고를 추가하면 수강생 연습실에 바로 표시됩니다."
                : "관리자가 원고를 등록하면 이곳에서 확인할 수 있습니다."}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-periwinkle-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-periwinkle-700"
              >
                <HugeiconsIcon icon={Add01Icon} size={16} color="currentColor" />
                <span>새 원고</span>
              </button>
            )}
          </div>
        </div>
      )}

      {hasScripts && (
        <div
          className={`fixed inset-0 z-[60] transition-opacity duration-200 ${
            selectedScript
              ? isReaderFullscreen
                ? "pointer-events-auto bg-gray-900/0 opacity-100"
                : "pointer-events-auto bg-gray-900/20 opacity-100"
              : "pointer-events-none bg-gray-900/0 opacity-0"
          }`}
        >
          <button
            type="button"
            aria-label="원고 닫기"
            onClick={() => selectScript(null)}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="원고 내용"
            className={`absolute flex h-dvh transform flex-col overflow-hidden bg-white shadow-sm transition-all duration-200 ease-out ${
              isReaderFullscreen
                ? "inset-0 w-full max-w-none"
                : "inset-y-0 right-0 w-full max-w-3xl md:w-[min(720px,calc(100vw-96px))]"
            } ${selectedScript ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
          >
            {selectedScript && (
              <PracticeScriptReader
                script={selectedScript}
                isAdmin={isAdmin}
                isEditing={isEditing}
                isDeleting={isDeleting}
                onEdit={() => setIsEditing(true)}
                onCancelEdit={() => setIsEditing(false)}
                onSaved={() => setIsEditing(false)}
                onDelete={() => void handleDeleteSelected()}
                onClose={() => selectScript(null)}
                isFullscreen={isReaderFullscreen}
                onToggleFullscreen={() => setIsReaderFullscreen((value) => !value)}
              />
            )}
          </aside>
        </div>
      )}

      {isModalOpen && <PracticeScriptCreateModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
