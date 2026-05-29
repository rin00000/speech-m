"use client";

/**
 * 프로토타입 스타일 조정판.
 * 둥글기, 카드 배경, 글로우, CSS 변수 복사, 현재 스와치 표시를 묶어 관리한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import type {
  CardBackgroundStyle,
  RoundingMode,
  ThemeKey,
  ThemePreset,
} from "./prototype-theme-presets";

type PrototypeControlPanelProps = {
  selectedTheme: ThemeKey;
  currentTheme: ThemePreset;
  roundingMode: RoundingMode;
  bgStyle: CardBackgroundStyle;
  useGlow: boolean;
  onRoundingModeChange: (mode: RoundingMode) => void;
  onBgStyleChange: (style: CardBackgroundStyle) => void;
  onUseGlowChange: (useGlow: boolean) => void;
};

export function PrototypeControlPanel({
  selectedTheme,
  currentTheme,
  roundingMode,
  bgStyle,
  useGlow,
  onRoundingModeChange,
  onBgStyleChange,
  onUseGlowChange,
}: PrototypeControlPanelProps) {
  const copyCssToClipboard = () => {
    const cssCode = `:root {
  --periwinkle-50: ${currentTheme.colors.bg};
  --periwinkle-100: ${currentTheme.colors.subtle};
  --periwinkle-200: ${currentTheme.colors.key};
  --periwinkle-300: ${currentTheme.colors.border};
  --periwinkle-600: ${currentTheme.colors.accent};
  --periwinkle-700: ${currentTheme.colors.accentHover};
  --periwinkle-800: ${currentTheme.colors.accentActive};
  --periwinkle-900: ${currentTheme.colors.ink};

  --semantic-bg: var(--periwinkle-50);
  --semantic-subtle: var(--periwinkle-100);
  --semantic-accent: var(--periwinkle-600);
}`;
    navigator.clipboard.writeText(cssCode);
    alert("테마 CSS 변수 코드가 클립보드에 복사되었습니다! globals.css에 붙여넣어 즉시 적용해 볼 수 있습니다.");
  };

  return (
    <aside className="space-y-6">
      <div className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-base font-extrabold leading-tight text-gray-900">
            세부 스타일 다이얼
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            전체적인 마감 처리를 세부 조정해 분위기를 바꿉니다.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500">
            모서리 둥글기 (Border Radius)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["tiimo", "sharp", "none"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onRoundingModeChange(mode)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-all",
                  roundingMode === mode
                    ? "border-periwinkle-600 bg-periwinkle-50 font-bold text-periwinkle-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                {mode === "tiimo" && "Tiimo (3xl)"}
                {mode === "sharp" && "Sharp (6px)"}
                {mode === "none" && "Cyber (0px)"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500">
            배경 스타일 (Card Background)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["solid", "glass", "transparent"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onBgStyleChange(style)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-all",
                  bgStyle === style
                    ? "border-periwinkle-600 bg-periwinkle-50 font-bold text-periwinkle-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                {style === "solid" && "Solid White"}
                {style === "glass" && "Glass Blur"}
                {style === "transparent" && "Transparent"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-2">
          <label className="text-xs font-bold text-gray-500">인터랙티브 디테일</label>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-gray-800">소프트 발광 글로우</span>
              <p className="text-[10px] text-gray-400">
                마우스 호버 시 포인트 컬러 발광 효과
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUseGlowChange(!useGlow)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                useGlow ? "bg-periwinkle-600" : "bg-gray-200",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                  useGlow ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <Button
            onClick={copyCssToClipboard}
            className="flex w-full items-center justify-center gap-2 rounded-full py-3"
          >
            <HugeiconsIcon icon={Copy01Icon} size={15} color="currentColor" strokeWidth={2} />
            선택한 테마 CSS 복사
          </Button>
          <p className="text-center text-[10px] text-gray-400">
            복사한 CSS를 globals.css 상단에 정의하면 앱 전체 룩이 변경됩니다.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-sm font-extrabold leading-tight text-gray-900">
            {currentTheme.name} 스펙트럼
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            현재 활성화된 키 밸류 맵입니다.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {currentTheme.swatches.map(([step, hex, label]) => (
            <div
              key={step}
              className="flex items-center justify-between rounded-xl border border-gray-150 bg-gray-50 p-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-5 w-5 rounded-md border border-black/5"
                  style={{ backgroundColor: hex }}
                />
                <div>
                  <p className="text-[11px] font-bold text-gray-700">
                    {selectedTheme}-{step}
                  </p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              </div>
              <span className="font-mono text-[10px] font-medium text-gray-500">{hex}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
