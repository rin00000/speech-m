"use client";

import { useState } from "react";
import type { ScriptItem } from "./page";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  SparklesIcon,
  CheckmarkCircle01Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons";

export function PracticeListView({ scripts }: { scripts: ScriptItem[] }) {
  const [activeCategory, setActiveCategory] = useState<"practice" | "portfolio">("practice");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(scripts[0]?.id ?? null);

  const filtered = scripts.filter((s) => s.category === activeCategory);
  const selectedScript = scripts.find((s) => s.id === selectedScriptId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-8">
      {/* Left panel - Navigation and script list */}
      <div className="space-y-6">
        {/* Category switcher tabs */}
        <div className="flex rounded-2xl bg-gray-100 p-1 border border-gray-200">
          <button
            onClick={() => {
              setActiveCategory("practice");
              const sub = scripts.find((s) => s.category === "practice");
              if (sub) setSelectedScriptId(sub.id);
            }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              activeCategory === "practice"
                ? "bg-white text-periwinkle-700 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <HugeiconsIcon icon={Task01Icon} size={14} color="currentColor" />
            <span>🎙️ 핵심 연습용 원고</span>
          </button>
          <button
            onClick={() => {
              setActiveCategory("portfolio");
              const sub = scripts.find((s) => s.category === "portfolio");
              if (sub) setSelectedScriptId(sub.id);
            }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              activeCategory === "portfolio"
                ? "bg-white text-periwinkle-700 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <HugeiconsIcon icon={SparklesIcon} size={14} color="currentColor" />
            <span>📁 명품 포트폴리오 원고</span>
          </button>
        </div>

        {/* Script Cards List */}
        <div className="space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
          {filtered.map((script) => {
            const isSelected = script.id === selectedScriptId;
            return (
              <div
                key={script.id}
                onClick={() => setSelectedScriptId(script.id)}
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

                <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-gray-400">
                  <span>📝 약 {script.length}자</span>
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
      </div>

      {/* Right panel - Script Reader */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col h-full min-h-[500px]">
        {selectedScript ? (
          <div className="flex-1 flex flex-col">
            {/* Header info */}
            <div className="border-b border-gray-100 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-periwinkle-50 px-2.5 py-0.5 text-xs font-bold text-periwinkle-700">
                  {selectedScript.type}
                </span>
                <span className="text-xs font-semibold text-gray-400">
                  공고 규격: 약 {selectedScript.length}자 (난이도: {selectedScript.difficulty})
                </span>
              </div>
              <h2 className="mt-3 text-lg md:text-xl font-extrabold text-gray-900 leading-snug">
                {selectedScript.title}
              </h2>
              <p className="mt-1 text-xs text-gray-400 leading-tight">
                {selectedScript.description}
              </p>
            </div>

            {/* Script content view */}
            <div className="flex-1 mt-6 rounded-2xl bg-gray-50 border border-gray-100 p-6 md:p-8 overflow-y-auto max-h-[55vh]">
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
                    ? "중간중간 포함된 복잡한 숫자 표기와 고난도 경제 전문 어휘들은 소리 내어 3번 이상 반복 연습하세요. 호흡 배분이 승부처입니다."
                    : selectedScript.difficulty === "보통"
                    ? "가장 대중적인 포맷입니다. 기어들어가지 않는 또렷한 발성과 차분하게 팩트를 전달하는 아우라를 풍겨보세요."
                    : "초심자를 위한 기본 대본입니다. 미소 띤 미려한 눈빛과 경쾌한 톤조절, 전달하고자 하는 따스한 마음을 소리에 실어보세요."}
                </p>
              </div>
            </div>
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
  );
}
