"use client";

/**
 * 연습실 원고 목록 화면의 상태 조립 컴포넌트.
 * 카테고리, 선택 원고, 편집/등록 모달 상태를 관리하고 세부 UI는 하위 컴포넌트로 위임한다.
 */

import { useState } from "react";
import { deletePracticeScript } from "@/app/actions/practice";
import { PracticeCategoryTabs } from "./practice-category-tabs";
import { PracticeScriptCreateModal } from "./practice-script-create-modal";
import { PracticeScriptList } from "./practice-script-list";
import { PracticeScriptReader } from "./practice-script-reader";
import type { PracticeCategory, ScriptItem } from "./practice-list-types";

export function PracticeListView({
  scripts,
  isAdmin,
}: {
  scripts: ScriptItem[];
  isAdmin?: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<PracticeCategory>("practice");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(scripts[0]?.id ?? null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = scripts.filter((script) => script.category === activeCategory);
  const effectiveSelectedScriptId = selectedScriptId ?? filtered[0]?.id ?? null;
  const selectedScript = scripts.find((script) => script.id === effectiveSelectedScriptId);

  const selectScript = (id: string | null) => {
    setSelectedScriptId(id);
    setIsEditing(false);
  };

  const handleCategoryChange = (category: PracticeCategory) => {
    setActiveCategory(category);
    const firstInCategory = scripts.find((script) => script.category === category);
    selectScript(firstInCategory?.id ?? null);
  };

  const handleDeleteSelected = async () => {
    if (!selectedScript) return;
    if (!confirm("정말로 이 원고를 삭제하시겠습니까?")) return;

    setIsDeleting(true);
    try {
      const res = await deletePracticeScript(selectedScript.id);
      if (res.success) {
        selectScript(null);
        return;
      }
      alert(res.error || "삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.3fr] lg:gap-8">
        <div className="space-y-4 md:space-y-6">
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

        <PracticeScriptReader
          script={selectedScript}
          isAdmin={isAdmin}
          isEditing={isEditing}
          isDeleting={isDeleting}
          onEdit={() => setIsEditing(true)}
          onCancelEdit={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
          onDelete={() => void handleDeleteSelected()}
        />
      </div>

      {isModalOpen && <PracticeScriptCreateModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
