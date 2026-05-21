/**
 * @file prototype-catalog.tsx
 * @description Speech-M UI 프로토타입 테마 실험실 컴포넌트입니다.
 * 오리지널 Tiimo 디자인 시스템을 보존하면서, 사용자가 키 컬러preset 및 둥글기, 투명도 등의 트렌디한 요소를 
 * 실시간으로 토글하여 상호작용하고 최적의 디자인 조정을 선택할 수 있게 돕는 샌드박스 카탈로그입니다.
 * 
 * 주요 진입점: PrototypeCatalog
 */

"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  CheckmarkCircle01Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  Settings01Icon,
  BookOpen01Icon,
  RefreshIcon,
  AlertCircleIcon,
  LinkSquare01Icon,
  Copy01Icon
} from "@hugeicons/core-free-icons";
import { AppShell } from "@/components/app/layout/app-shell";
import { getNavItemsForRole } from "@/components/app/layout/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { OptionPill } from "@/components/ui/option-pill";
import type { UserRole } from "@/lib/auth/session";
import { cn } from "@/lib/ui/cn";

// 테마 프리셋 정의
type ThemeKey = "periwinkle" | "mint" | "apricot" | "lavender" | "cyber";

interface ThemePreset {
  name: string;
  desc: string;
  colors: {
    bg: string;
    subtle: string;
    key: string;
    border: string;
    accent: string;
    accentHover: string;
    accentActive: string;
    ink: string;
  };
  swatches: Array<[string, string, string]>;
}

const THEMES: Record<ThemeKey, ThemePreset> = {
  periwinkle: {
    name: "Periwinkle Classic (Original Tiimo)",
    desc: "아카데미의 신뢰감과 안정감을 주는 편안하고 맑은 파스텔 블루",
    colors: {
      bg: "#F4F8FE",      // periwinkle-50
      subtle: "#E5EEFC",  // periwinkle-100
      key: "#D2E0FB",     // periwinkle-200
      border: "#B0C6F0",  // periwinkle-300
      accent: "#4D72B3",  // periwinkle-600
      accentHover: "#3A5994", // periwinkle-700
      accentActive: "#2A4275", // periwinkle-800
      ink: "#1B2B52",     // periwinkle-900
    },
    swatches: [
      ["50", "#F4F8FE", "배경색 (bg-bg)"],
      ["100", "#E5EEFC", "소프트 칩 (bg-subtle)"],
      ["200", "#D2E0FB", "키 컬러 (border-accent)"],
      ["600", "#4D72B3", "액션 버튼 (bg-accent)"],
      ["900", "#1B2B52", "메인 텍스트 (ink)"],
    ]
  },
  mint: {
    name: "Neo Forest & Mint (Fresh Tech)",
    desc: "최신 IT 크리에이티브 허브를 연상시키는 신선하고 깔끔한 에메랄드&민트",
    colors: {
      bg: "#F0FDF4",      // mint-50
      subtle: "#DCFCE7",  // mint-100
      key: "#BBF7D0",     // mint-200
      border: "#86EFAC",  // mint-300
      accent: "#16A34A",  // mint-600
      accentHover: "#15803D", // mint-700
      accentActive: "#14532D", // mint-800
      ink: "#14532D",     // mint-900
    },
    swatches: [
      ["50", "#F0FDF4", "배경색 (bg-bg)"],
      ["100", "#DCFCE7", "소프트 칩 (bg-subtle)"],
      ["200", "#BBF7D0", "키 컬러 (border-accent)"],
      ["600", "#16A34A", "액션 버튼 (bg-accent)"],
      ["900", "#14532D", "메인 텍스트 (ink)"],
    ]
  },
  apricot: {
    name: "Warm Apricot (Sunset Peach)",
    desc: "친근하고 긍정적인 무드를 연출하며 가독성이 훌륭한 웜톤 오렌지 피치",
    colors: {
      bg: "#FFF7ED",      // orange-50
      subtle: "#FFEDD5",  // orange-100
      key: "#FED7AA",     // orange-200
      border: "#FDBA74",  // orange-300
      accent: "#EA580C",  // orange-600
      accentHover: "#C2410C", // orange-700
      accentActive: "#9A3412", // orange-800
      ink: "#431407",     // orange-900
    },
    swatches: [
      ["50", "#FFF7ED", "배경색 (bg-bg)"],
      ["100", "#FFEDD5", "소프트 칩 (bg-subtle)"],
      ["200", "#FED7AA", "키 컬러 (border-accent)"],
      ["600", "#EA580C", "액션 버튼 (bg-accent)"],
      ["900", "#431407", "메인 텍스트 (ink)"],
    ]
  },
  lavender: {
    name: "Lavender Boutique (Chic Violet)",
    desc: "고급스러운 부티크 아카데미의 세련되고 감각적인 크리에이티브 퍼플",
    colors: {
      bg: "#FAF5FF",      // purple-50
      subtle: "#F3E8FF",  // purple-100
      key: "#E9D5FF",     // purple-200
      border: "#D8B4FE",  // purple-300
      accent: "#7E22CE",  // purple-600
      accentHover: "#6B21A8", // purple-700
      accentActive: "#581C87", // purple-800
      ink: "#2E1065",     // purple-900
    },
    swatches: [
      ["50", "#FAF5FF", "배경색 (bg-bg)"],
      ["100", "#F3E8FF", "소프트 칩 (bg-subtle)"],
      ["200", "#E9D5FF", "키 컬러 (border-accent)"],
      ["600", "#7E22CE", "액션 버튼 (bg-accent)"],
      ["900", "#2E1065", "메인 텍스트 (ink)"],
    ]
  },
  cyber: {
    name: "Cyber Lime & Charcoal (Edgy Mono)",
    desc: "시크한 차콜 블랙 뼈대에 힙한 라임 형광 포인트를 얹은 고대비 스타일",
    colors: {
      bg: "#FAFAFA",      // zinc-50
      subtle: "#F4F4F5",  // zinc-100
      key: "#BEF264",     // lime-300
      border: "#E4E4E7",  // zinc-200
      accent: "#18181B",  // zinc-900
      accentHover: "#27272A", // zinc-800
      accentActive: "#09090B", // zinc-950
      ink: "#09090B",     // zinc-950
    },
    swatches: [
      ["50", "#FAFAFA", "배경색 (bg-bg)"],
      ["100", "#F4F4F5", "소프트 칩 (bg-subtle)"],
      ["200", "#BEF264", "형광 라임 (key-point)"],
      ["600", "#18181B", "액션 버튼 (bg-accent)"],
      ["900", "#09090B", "메인 텍스트 (ink)"],
    ]
  }
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold leading-[1.1] tracking-tight text-gray-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm font-medium leading-tight text-gray-500">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function TokenSwatch({
  name,
  hex,
  note,
}: {
  name: string;
  hex: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-transform duration-200 hover:-translate-y-1">
      <div
        className="h-14 rounded-xl border border-black/5"
        style={{ backgroundColor: hex }}
      />
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold leading-tight text-gray-900">
            {name}
          </p>
          <p className="mt-0.5 text-[11px] font-medium leading-none text-gray-500">
            {hex}
          </p>
        </div>
        {note && (
          <span className="rounded-full border border-gray-150 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold leading-none text-gray-600">
            {note}
          </span>
        )}
      </div>
    </div>
  );
}

export function PrototypeCatalog({
  userName,
  initialRole,
}: {
  userName: string | null;
  initialRole: UserRole;
}) {
  const [role, setRole] = useState<UserRole>(initialRole);
  
  // 테마 상태 관리
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("periwinkle");
  
  // 둥글기 모드: "tiimo" (3xl/full), "sharp" (6px), "none" (직각)
  const [roundingMode, setRoundingMode] = useState<"tiimo" | "sharp" | "none">("tiimo");
  
  // 백그라운드 모드: "solid" (흰색 불투명), "glass" (글래스모피즘 반투명+블러), "transparent" (투명)
  const [bgStyle, setBgStyle] = useState<"solid" | "glass" | "transparent">("solid");

  // 카드 외곽선 발광(Glow) 유무 토글 (최신 트렌드)
  const [useGlow, setUseGlow] = useState<boolean>(true);

  // 크롤 동기화 임시 상태
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success">("idle");

  const currentTheme = THEMES[selectedTheme];

  // 인라인 스타일로 자식 컴포넌트들에 테마 변수 강제 주입
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

  // 모드별 조절 클래스
  const roundingClass = 
    roundingMode === "sharp" 
      ? "style-sharp" 
      : roundingMode === "none"
        ? "[&_*]:!rounded-none" 
        : ""; // tiimo 기본값 (rounded-3xl, rounded-full)

  const cardBgClass = 
    bgStyle === "transparent"
      ? "bg-transparent! backdrop-blur-none border border-gray-200"
      : bgStyle === "glass"
        ? "bg-white/70! backdrop-blur-md border border-white/20 shadow-sm"
        : "bg-white border border-gray-200 shadow-sm";

  const glowClass = useGlow
    ? `hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:border-${selectedTheme === 'cyber' ? 'black' : 'accent'}/30`
    : "transition-all duration-200";

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

  const handleSyncTrigger = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-bg transition-colors duration-500" style={styleVariables as React.CSSProperties}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
        
        {/* 히어로 헤더 */}
        <header className="flex flex-col gap-6 rounded-4xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-3 py-1 text-xs font-semibold leading-none text-periwinkle-700">
                Speech-M UI Playground
              </span>
              <span className="inline-flex rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-semibold leading-none text-amber-700 animate-pulse">
                실시간 샌드박스
              </span>
            </div>
            <h1 className="text-3xl font-extrabold leading-[1.05] tracking-tight text-gray-900 pt-2">
              트렌디 큐레이션 실험실
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-tight text-gray-500">
              미니멀리즘 속의 트렌디함. 테마별 5대 프리셋과 스타일 조합을 즉석에서 검토해 보세요. 
              마음에 드는 조합의 코드도 즉시 복사 가능합니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="text-xs font-semibold text-gray-400">페르소나 전환</p>
            <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
              {(["admin", "student"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold leading-none transition-colors",
                    role === r
                      ? "bg-periwinkle-600 text-white shadow-sm"
                      : "text-gray-500 hover:bg-white hover:text-gray-800",
                  )}
                >
                  {r === "admin" ? "원장 대시보드" : "준비생 메인"}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* 1단계: 테마 프리셋 셀렉터 */}
        <section className="grid gap-4 md:grid-cols-5">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const isSelected = selectedTheme === key;
            const theme = THEMES[key];
            return (
              <button
                key={key}
                onClick={() => setSelectedTheme(key)}
                className={cn(
                  "flex flex-col text-left p-4 rounded-3xl border transition-all duration-300 bg-white",
                  isSelected
                    ? "border-periwinkle-600 ring-2 ring-periwinkle-500/20 shadow-md scale-102"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-extrabold tracking-tight text-gray-900">{theme.name.split(" (")[0]}</span>
                  <span 
                    className="h-3 w-3 rounded-full border border-black/5" 
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-medium leading-tight text-gray-400 line-clamp-2">
                  {theme.desc}
                </p>
                <div className="mt-3 flex gap-1">
                  <span className="h-5 w-5 rounded-full border border-black/5" style={{ backgroundColor: theme.colors.bg }} />
                  <span className="h-5 w-5 rounded-full border border-black/5" style={{ backgroundColor: theme.colors.subtle }} />
                  <span className="h-5 w-5 rounded-full border border-black/5" style={{ backgroundColor: theme.colors.key }} />
                  <span className="h-5 w-5 rounded-full border border-black/5" style={{ backgroundColor: theme.colors.accent }} />
                </div>
              </button>
            );
          })}
        </section>

        {/* 메인 에디터 및 미리보기 */}
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          
          {/* 조정판 (Adjuster Panel) */}
          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-extrabold leading-tight text-gray-900">
                  세부 스타일 다이얼
                </h3>
                <p className="mt-0.5 text-xs text-gray-400">
                  전체적인 마감 처리를 세부 조정해 분위기를 바꿉니다.
                </p>
              </div>

              {/* 1. 둥글기 (Rounding) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">모서리 둥글기 (Border Radius)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["tiimo", "sharp", "none"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setRoundingMode(mode)}
                      className={cn(
                        "py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center",
                        roundingMode === mode
                          ? "border-periwinkle-600 bg-periwinkle-50 text-periwinkle-700 font-bold"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {mode === "tiimo" && "Tiimo (3xl)"}
                      {mode === "sharp" && "Sharp (6px)"}
                      {mode === "none" && "Cyber (0px)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 카드 백그라운드 재질 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">배경 스타일 (Card Background)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["solid", "glass", "transparent"] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setBgStyle(style)}
                      className={cn(
                        "py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center",
                        bgStyle === style
                          ? "border-periwinkle-600 bg-periwinkle-50 text-periwinkle-700 font-bold"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {style === "solid" && "Solid White"}
                      {style === "glass" && "Glass Blur"}
                      {style === "transparent" && "Transparent"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. 트렌디한 효과 토글 */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-500">인터랙티브 디테일</label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-gray-800">소프트 발광 글로우</span>
                    <p className="text-[10px] text-gray-400">마우스 호버 시 포인트 컬러 발광 효과</p>
                  </div>
                  <button
                    onClick={() => setUseGlow(!useGlow)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      useGlow ? "bg-periwinkle-600" : "bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        useGlow ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* 4. 코드 추출 */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <Button 
                  onClick={copyCssToClipboard} 
                  className="w-full flex items-center justify-center gap-2 rounded-full py-3"
                >
                  <HugeiconsIcon icon={Copy01Icon} size={15} color="currentColor" strokeWidth={2} />
                  선택한 테마 CSS 복사
                </Button>
                <p className="text-[10px] text-center text-gray-400">
                  복사한 CSS를 globals.css 상단에 정의하면 앱 전체 룩이 변경됩니다.
                </p>
              </div>

            </div>

            {/* 현재 테마의 스와치 일람 */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
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
                  <div key={step} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-150">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md border border-black/5" style={{ backgroundColor: hex }} />
                      <div>
                        <p className="text-[11px] font-bold text-gray-700">{selectedTheme}-{step}</p>
                        <p className="text-[10px] text-gray-400">{label}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 font-medium">{hex}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* 실시간 렌더링 쇼케이스 피드 */}
          <main className={cn("space-y-8", roundingClass)}>
            
            {/* 컴포넌트 프리뷰 데모 */}
            <div className="space-y-6">
              
              {/* 데모 1: 채용 공고 리스트 (Scrape -> AI Filter) */}
              <div className={cn("rounded-3xl p-6 transition-all duration-300", cardBgClass, glowClass)}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-2 py-0.5 text-[10px] font-bold text-periwinkle-700 uppercase tracking-wider">
                      Module: Scraper AI Filter Queue
                    </span>
                    <h3 className="text-base font-extrabold leading-tight text-gray-900 mt-1">
                      공고 검토 관리자 피드
                    </h3>
                  </div>
                  <Badge tone="neutral" className="text-[10px]">Curation Quality Bar: High</Badge>
                </div>

                <div className="divide-y divide-gray-100 space-y-1">
                  
                  {/* 공고 아이템 1 (AI 적합 통과) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-gray-900 leading-tight">
                          KBS 신입 아나운서 공개 채용 (서울 본사)
                        </h4>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold leading-none text-emerald-700">
                          AI 적합 94%
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-400">
                        MediaJob · 마감 D-5 · 서울 여의도 본사 · 프리랜서/정규직
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <Button size="sm" variant="soft">승인</Button>
                      <Button size="sm" variant="ghost">거절</Button>
                    </div>
                  </div>

                  {/* 공고 아이템 2 (보류 및 수동 검토 대기) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-gray-900 leading-tight">
                          MBC 기상캐스터 경력 사원 채용
                        </h4>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold leading-none text-amber-700">
                          검토 보류 68%
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-400">
                        아랑 네이버 카페 · 마감 D-12 · 서울 마포구 상암동
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <Button size="sm" variant="soft">승인</Button>
                      <Button size="sm" variant="ghost">거절</Button>
                    </div>
                  </div>

                  {/* 공고 아이템 3 (자동 필터 아웃) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-gray-600 line-through leading-tight">
                          개인 유튜브 채널 리포터 모집
                        </h4>
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-extrabold leading-none text-red-700">
                          자동 제외 (유튜브 전용)
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-400">
                        알바몬 크롤러 · 마감 D-2 · 전국 재택근무
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-xs font-bold text-red-500 px-3 py-1.5 bg-red-50 border border-red-100 rounded-full">자동 제외됨</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* 데모 2: 스터디 리포트 & 레코딩 피드백 (Study Operations) */}
              <div className="grid gap-4 sm:grid-cols-2">
                
                {/* 스터디 피드백 보드 */}
                <div className={cn("p-6 transition-all duration-300", cardBgClass, glowClass)}>
                  <div className="space-y-1 mb-4">
                    <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-2 py-0.5 text-[10px] font-bold text-periwinkle-700 uppercase tracking-wider">
                      Module: Study Operations
                    </span>
                    <h3 className="text-base font-extrabold leading-tight text-gray-900 mt-1">
                      1:1 릴레이 피드백 콘솔
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl border border-gray-150 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-gray-800">김서현 준비생 (KBS 뉴스 앵커 반)</p>
                        <span className="h-2 w-2 rounded-full bg-periwinkle-600 animate-ping" />
                      </div>
                      <p className="mt-1 text-xs text-gray-400 leading-tight">
                        제출 음성: <strong>news_practice_kbs_05.mp3</strong>
                      </p>
                      
                      <div className="mt-3 flex items-center justify-between bg-white rounded-full border border-gray-200 p-1 px-3">
                        <span className="text-[10px] font-semibold text-gray-500">제출 녹음 02:14</span>
                        <button className="h-6 w-6 rounded-full bg-periwinkle-600 text-white flex items-center justify-center hover:bg-periwinkle-700 shadow-sm transition-colors">
                          <span className="text-[9px] font-extrabold">▶</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">원장 피드백 코멘트</label>
                      <textarea 
                        className="w-full text-xs p-3 border border-gray-200 bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-periwinkle-500/30 font-medium text-gray-700" 
                        rows={3}
                        defaultValue="오프닝 멘트의 톤이 매우 신뢰감 있게 보강되었습니다. 다만, 3번째 줄 수치 정보 낭독 시 긴장으로 인해 끝음을 살짝 올리는 습관이 아직 남아있으니 이 부분을 플랫하게 내려주는 연습이 필요합니다."
                      />
                    </div>

                    <Button className="w-full text-xs font-semibold py-2">
                      피드백 전송 완료
                    </Button>
                  </div>
                </div>

                {/* 크롤링 트리거 및 메트릭 현황 */}
                <div className={cn("p-6 transition-all duration-300", cardBgClass, glowClass)}>
                  <div className="space-y-1 mb-4">
                    <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-2 py-0.5 text-[10px] font-bold text-periwinkle-700 uppercase tracking-wider">
                      Module: Scraper Dashboard
                    </span>
                    <h3 className="text-base font-extrabold leading-tight text-gray-900 mt-1">
                      크롤러 제어 허브
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl">
                        <span className="text-[10px] font-bold text-gray-400">금일 크롤 수량</span>
                        <p className="text-xl font-extrabold text-gray-800 mt-1">247건</p>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl">
                        <span className="text-[10px] font-bold text-gray-400">AI 통과 Curation</span>
                        <p className="text-xl font-extrabold text-periwinkle-700 mt-1">18건</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">미디어잡 동기화</span>
                        <span className="text-[10px] text-gray-400 font-medium">최근 2시간 전</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">아랑 카페 동기화</span>
                        <span className="text-[10px] text-gray-400 font-medium">최근 4시간 전</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleSyncTrigger}
                        disabled={isSyncing}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold leading-none shadow-sm transition-all duration-300",
                          isSyncing 
                            ? "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                            : syncStatus === "success"
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        <HugeiconsIcon
                          icon={syncStatus === "success" ? CheckmarkCircle01Icon : RefreshIcon}
                          size={13}
                          color="currentColor"
                          strokeWidth={2}
                          className={isSyncing ? "animate-spin" : ""}
                        />
                        {isSyncing ? "수집 동기화 중..." : syncStatus === "success" ? "동기화 완료" : "실시간 수집 트리거"}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* 데모 3: Responsive AppShell Mockup */}
              <div className={cn("p-6 transition-all duration-300", cardBgClass, glowClass)}>
                <div className="space-y-1 mb-4">
                  <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-2 py-0.5 text-[10px] font-bold text-periwinkle-700 uppercase tracking-wider">
                    Responsive AppShell
                  </span>
                  <h3 className="text-base font-extrabold leading-tight text-gray-900 mt-1">
                    사이드바 / 바텀탭 레이아웃 체계
                  </h3>
                </div>

                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 p-1 shadow-inner">
                  <AppShell userRole={role} userName={userName} previewPathname="/dashboard">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-gray-900">운영 대시보드 홈</h4>
                        <span className="text-[10px] font-semibold text-gray-400">스프레드시트 뷰 통합</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ["전체", "139건"],
                          ["대기", "41건"],
                          ["완료", "98건"]
                        ].map(([title, val]) => (
                          <div key={title} className="p-3 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
                            <span className="text-[9px] font-bold text-gray-400">{title}</span>
                            <p className="text-sm font-extrabold text-gray-900 mt-0.5">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AppShell>
                </div>
              </div>

            </div>
          </main>

        </div>

      </div>
    </div>
  );
}
