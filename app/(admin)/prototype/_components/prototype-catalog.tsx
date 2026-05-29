"use client";

/**
 * Speech-M UI 프로토타입 테마 실험실의 상태 조립 컴포넌트.
 * 테마/스타일 상태와 CSS 변수만 관리하고, 헤더·조정판·쇼케이스 UI는 하위 파일에 위임한다.
 */

import { useState, type CSSProperties } from "react";
import type { UserRole } from "@/lib/auth/session";
import { PrototypeControlPanel } from "./prototype-control-panel";
import { PrototypeHero } from "./prototype-hero";
import { PrototypeShowcase } from "./prototype-showcase";
import { PrototypeThemeSelector } from "./prototype-theme-selector";
import {
  THEMES,
  type CardBackgroundStyle,
  type RoundingMode,
  type ThemeKey,
} from "./prototype-theme-presets";

export function PrototypeCatalog({
  userName,
  initialRole,
}: {
  userName: string | null;
  initialRole: UserRole;
}) {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("periwinkle");
  const [roundingMode, setRoundingMode] = useState<RoundingMode>("tiimo");
  const [bgStyle, setBgStyle] = useState<CardBackgroundStyle>("solid");
  const [useGlow, setUseGlow] = useState(true);

  const currentTheme = THEMES[selectedTheme];
  const styleVariables: Record<string, string> = {
    "--periwinkle-50": currentTheme.colors.bg,
    "--periwinkle-100": currentTheme.colors.subtle,
    "--periwinkle-200": currentTheme.colors.key,
    "--periwinkle-300": currentTheme.colors.border,
    "--periwinkle-600": currentTheme.colors.accent,
    "--periwinkle-700": currentTheme.colors.accentHover,
    "--periwinkle-800": currentTheme.colors.accentActive,
    "--periwinkle-900": currentTheme.colors.ink,
    "--semantic-bg": currentTheme.colors.bg,
    "--semantic-subtle": currentTheme.colors.subtle,
    "--semantic-accent": currentTheme.colors.accent,
    "--accent": currentTheme.colors.accent,
    "--app-bg": currentTheme.colors.bg,
    "--app-accent": currentTheme.colors.accent,
    "--app-accent-soft": currentTheme.colors.subtle,
  };

  const roundingClass =
    roundingMode === "sharp"
      ? "style-sharp"
      : roundingMode === "none"
        ? "[&_*]:!rounded-none"
        : "";

  const cardBgClass =
    bgStyle === "transparent"
      ? "bg-transparent! backdrop-blur-none border border-gray-200"
      : bgStyle === "glass"
        ? "bg-white/70! backdrop-blur-md border border-white/20 shadow-sm"
        : "bg-white border border-gray-200 shadow-sm";

  const glowClass = useGlow
    ? `hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:border-${
        selectedTheme === "cyber" ? "black" : "accent"
      }/30`
    : "transition-all duration-200";

  return (
    <div
      className="min-h-screen bg-bg transition-colors duration-500"
      style={styleVariables as CSSProperties}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
        <PrototypeHero role={role} onRoleChange={setRole} />
        <PrototypeThemeSelector selectedTheme={selectedTheme} onThemeChange={setSelectedTheme} />

        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <PrototypeControlPanel
            selectedTheme={selectedTheme}
            currentTheme={currentTheme}
            roundingMode={roundingMode}
            bgStyle={bgStyle}
            useGlow={useGlow}
            onRoundingModeChange={setRoundingMode}
            onBgStyleChange={setBgStyle}
            onUseGlowChange={setUseGlow}
          />
          <PrototypeShowcase
            userName={userName}
            role={role}
            roundingClass={roundingClass}
            cardBgClass={cardBgClass}
            glowClass={glowClass}
          />
        </div>
      </div>
    </div>
  );
}
