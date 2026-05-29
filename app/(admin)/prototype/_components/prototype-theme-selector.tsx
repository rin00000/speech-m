"use client";

/**
 * 프로토타입 테마 프리셋 선택 그리드.
 * 프리셋 데이터 표시와 선택 이벤트만 담당한다.
 */

import { cn } from "@/lib/ui/cn";
import { THEMES, type ThemeKey } from "./prototype-theme-presets";

type PrototypeThemeSelectorProps = {
  selectedTheme: ThemeKey;
  onThemeChange: (theme: ThemeKey) => void;
};

export function PrototypeThemeSelector({
  selectedTheme,
  onThemeChange,
}: PrototypeThemeSelectorProps) {
  return (
    <section className="grid gap-4 md:grid-cols-5">
      {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
        const isSelected = selectedTheme === key;
        const theme = THEMES[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onThemeChange(key)}
            className={cn(
              "flex flex-col rounded-3xl border bg-white p-4 text-left transition-all duration-300",
              isSelected
                ? "scale-102 border-periwinkle-600 shadow-md ring-2 ring-periwinkle-500/20"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-extrabold tracking-tight text-gray-900">
                {theme.name.split(" (")[0]}
              </span>
              <span
                className="h-3 w-3 rounded-full border border-black/5"
                style={{ backgroundColor: theme.colors.accent }}
              />
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight text-gray-400">
              {theme.desc}
            </p>
            <div className="mt-3 flex gap-1">
              <span
                className="h-5 w-5 rounded-full border border-black/5"
                style={{ backgroundColor: theme.colors.bg }}
              />
              <span
                className="h-5 w-5 rounded-full border border-black/5"
                style={{ backgroundColor: theme.colors.subtle }}
              />
              <span
                className="h-5 w-5 rounded-full border border-black/5"
                style={{ backgroundColor: theme.colors.key }}
              />
              <span
                className="h-5 w-5 rounded-full border border-black/5"
                style={{ backgroundColor: theme.colors.accent }}
              />
            </div>
          </button>
        );
      })}
    </section>
  );
}
