"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { AppShell } from "@/components/app/layout/app-shell";
import { getNavItemsForRole } from "@/components/app/layout/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { OptionPill } from "@/components/ui/option-pill";
import type { UserRole } from "@/lib/auth/session";
import { cn } from "@/lib/ui/cn";

type FontChoice = "pretendard" | "suit" | "paperlogy";

const FONT_OPTIONS: { id: FontChoice; label: string; className: string }[] = [
  { id: "pretendard", label: "Pretendard", className: "font-pretendard" },
  { id: "suit", label: "SUIT", className: "font-suit" },
  { id: "paperlogy", label: "Paperlogy", className: "font-paperlogy" },
];

const PALETTE = [
  { name: "app-bg", className: "bg-stone-50", hex: "#fafaf9" },
  { name: "surface", className: "bg-white border border-zinc-200/50", hex: "#ffffff" },
  { name: "accent", className: "bg-violet-600", hex: "#7c3aed" },
  { name: "accent-soft", className: "bg-violet-100", hex: "#ede9fe" },
  { name: "border", className: "bg-zinc-200/50", hex: "zinc-200/50" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-stone-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm font-medium text-stone-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function FontToggleBar({
  font,
  onChange,
}: {
  font: FontChoice;
  onChange: (font: FontChoice) => void;
}) {
  return (
    <div className="sticky top-0 z-40 border-b border-zinc-200/50 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-xs font-semibold text-stone-500">폰트 비교</span>
        {FONT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              font === option.id
                ? "bg-violet-600 text-white"
                : "border border-zinc-200/50 bg-white text-stone-600 hover:bg-stone-50",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoleToggle({
  role,
  onChange,
}: {
  role: UserRole;
  onChange: (role: UserRole) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["admin", "student"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
            role === value
              ? "bg-violet-600 text-white"
              : "border border-zinc-200/50 bg-white text-stone-600 hover:bg-stone-50",
          )}
        >
          {value === "admin" ? "원장 (admin)" : "준비생 (student)"}
        </button>
      ))}
    </div>
  );
}

function LayoutPreviewFrame({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <div
        className={cn(
          "overflow-hidden rounded-3xl border border-zinc-200/50 bg-stone-100 shadow-sm",
          className,
        )}
      >
        {children}
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
  const [font, setFont] = useState<FontChoice>("pretendard");
  const [previewRole, setPreviewRole] = useState<UserRole>(initialRole);
  const [selectedOption, setSelectedOption] = useState(0);

  const fontClass = FONT_OPTIONS.find((f) => f.id === font)?.className ?? "font-pretendard";
  const navItems = getNavItemsForRole(previewRole);

  return (
    <div className={cn("min-h-screen", fontClass)}>
      <FontToggleBar font={font} onChange={setFont} />

      <AppShell userRole={previewRole} userName={userName} previewPathname="/dashboard">
        <div className="space-y-10 p-4 sm:p-6 md:p-8">
          <header className="space-y-2">
            <Badge tone="accent">Tiimo Design System</Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
              Speech-M UI 프로토타입
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-stone-600">
              웜톤 미색 배경, violet-600 포인트, 극도로 둥근 라운드. 폰트·Role·레이아웃을
              이 페이지에서 바로 확인하세요.
            </p>
          </header>

          <Section title="타이포그래피 샘플" description="선택한 폰트가 아래 전체에 적용됩니다.">
            <Card>
              <CardBody className="space-y-4 pt-6">
                <p className="text-3xl font-extrabold tracking-tight text-stone-900">
                  아나운서 준비, 오늘부터 시작
                </p>
                <p className="text-base font-medium text-stone-600">
                  Speech-M은 원장님과 준비생이 함께 쓰는 올인원 플랫폼입니다. 공고 수집부터
                  스터디 관리까지 한곳에서.
                </p>
                <p className="text-4xl font-extrabold tabular-nums text-violet-600">1,248</p>
              </CardBody>
            </Card>
          </Section>

          <Section title="컬러 팔레트">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {PALETTE.map((swatch) => (
                <div key={swatch.name} className="space-y-2">
                  <div className={cn("h-16 rounded-2xl", swatch.className)} />
                  <p className="text-xs font-semibold text-stone-700">{swatch.name}</p>
                  <p className="text-[11px] font-medium text-stone-400">{swatch.hex}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="컴포넌트 카탈로그">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Button</CardTitle>
                  <CardDescription>primary · ghost · soft × sm · md · lg</CardDescription>
                </CardHeader>
                <CardBody className="space-y-4">
                  {(["primary", "ghost", "soft"] as const).map((variant) => (
                    <div key={variant} className="flex flex-wrap items-center gap-2">
                      {(["sm", "md", "lg"] as const).map((size) => (
                        <Button key={`${variant}-${size}`} variant={variant} size={size}>
                          {variant} {size}
                        </Button>
                      ))}
                    </div>
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Badge</CardTitle>
                </CardHeader>
                <CardBody className="flex flex-wrap gap-2 pt-6">
                  <Badge tone="neutral">neutral</Badge>
                  <Badge tone="accent">accent</Badge>
                  <Badge tone="warn">warn</Badge>
                  <Badge tone="success">success</Badge>
                </CardBody>
              </Card>

              <div className="space-y-3">
                <ListRow
                  title="KBS 아나운서 공채"
                  subtitle="마감 D-3 · 서울"
                  icon={
                    <HugeiconsIcon
                      icon={Briefcase01Icon}
                      size={18}
                      color="currentColor"
                      strokeWidth={1.8}
                    />
                  }
                  trailing={
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-200" />
                  }
                />
                <ListRow
                  title="MBC 겨울 스터디"
                  subtitle="오늘 19:00 · 4/8명"
                  icon={
                    <HugeiconsIcon
                      icon={Clock01Icon}
                      size={18}
                      color="currentColor"
                      strokeWidth={1.8}
                    />
                  }
                  trailing={
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={20}
                      color="currentColor"
                      strokeWidth={1.8}
                      className="text-violet-600"
                    />
                  }
                />
              </div>

              <div className="space-y-2">
                {["공고 알림 받기", "스터디 일정 관리", "시험 후기 작성"].map((label, i) => (
                  <OptionPill
                    key={label}
                    selected={selectedOption === i}
                    onClick={() => setSelectedOption(i)}
                  >
                    {label}
                  </OptionPill>
                ))}
              </div>
            </div>
          </Section>

          <Section
            title="Role 분기 (더미)"
            description="admin일 때만 공고 관리·스터디 관리 메뉴가 노출됩니다."
          >
            <RoleToggle role={previewRole} onChange={setPreviewRole} />
            <Card className="mt-4">
              <CardBody className="pt-6">
                <ul className="space-y-2">
                  {navItems.map((item) => (
                    <li
                      key={`${item.href}-${item.label}`}
                      className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-stone-800">{item.label}</span>
                      <Badge tone={item.role === "admin" ? "accent" : "neutral"}>
                        {item.role}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </Section>

          <Section
            title="레이아웃 미리보기"
            description="모바일 프레임과 PC island를 나란히 확인합니다."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <LayoutPreviewFrame label="모바일 (max-w 420px)" className="mx-auto w-full max-w-[420px]">
                <div className="relative h-[520px] overflow-hidden bg-stone-50">
                  <div className="h-full overflow-y-auto pb-20">
                    <div className="space-y-3 p-4">
                      <p className="text-lg font-extrabold text-stone-900">오늘의 일정</p>
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className="rounded-2xl border border-zinc-200/50 bg-white p-4 shadow-sm"
                        >
                          <p className="text-sm font-semibold text-stone-800">스터디 세션 {n}</p>
                          <p className="mt-1 text-xs font-medium text-stone-500">19:00 · 60분</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-x-3 bottom-3">
                    <div className="shadow-island flex justify-around rounded-full border border-zinc-200/50 bg-white py-2">
                      {navItems.slice(0, 4).map((item, i) => (
                        <span
                          key={item.label}
                          className={cn(
                            "px-2 text-[10px] font-semibold",
                            i === 0 ? "text-violet-700" : "text-stone-400",
                          )}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </LayoutPreviewFrame>

              <LayoutPreviewFrame label="PC island (md+)" className="h-[520px]">
                <div className="flex h-full gap-3 bg-stone-50 p-3">
                  <div className="hidden w-16 shrink-0 flex-col rounded-3xl border border-zinc-200/50 bg-white p-2 sm:flex">
                    {navItems.slice(0, 5).map((item, i) => (
                      <div
                        key={item.label}
                        className={cn(
                          "mb-1 flex h-10 items-center justify-center rounded-xl text-[10px] font-bold",
                          i === 0 ? "bg-violet-100 text-violet-700" : "text-stone-400",
                        )}
                      >
                        {item.label.slice(0, 2)}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto rounded-3xl border border-zinc-200/50 bg-white p-5 shadow-sm">
                    <p className="text-xl font-extrabold text-stone-900">대시보드</p>
                    <p className="mt-1 text-sm font-medium text-stone-500">
                      PC에서는 좌측 SideRail + 둥근 island main
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {["등록 공고", "승인 공고", "스터디", "후기"].map((label) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-zinc-200/50 bg-stone-50 p-4"
                        >
                          <p className="text-xs font-medium text-stone-500">{label}</p>
                          <p className="mt-1 text-2xl font-extrabold text-stone-900">42</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </LayoutPreviewFrame>
            </div>
          </Section>
        </div>
      </AppShell>
    </div>
  );
}
