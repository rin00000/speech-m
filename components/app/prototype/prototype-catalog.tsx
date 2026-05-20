"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Briefcase01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
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

const periwinkleTokens = [
  ["50", "#F4F8FE", "page bg"],
  ["100", "#E5EEFC", "soft chip"],
  ["200", "#D2E0FB", "key color"],
  ["300", "#B0C6F0", "border tint"],
  ["400", "#8EACCD", "secondary"],
  ["500", "#6A8FBD", "hover"],
  ["600", "#4D72B3", "primary action"],
  ["700", "#3A5994", "active text"],
  ["800", "#2A4275", "deep accent"],
  ["900", "#1B2B52", "ink blue"],
] as const;

const grayTokens = [
  ["50", "#F8FAFC"],
  ["100", "#F1F5F9"],
  ["200", "#E2E8F0"],
  ["300", "#CBD5E1"],
  ["400", "#94A3B8"],
  ["500", "#64748B"],
  ["600", "#475569"],
  ["700", "#334155"],
  ["800", "#1E293B"],
  ["900", "#0F172A"],
] as const;

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
    <section className="space-y-3">
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
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div
        className="h-12 rounded-2xl border border-black/5"
        style={{ backgroundColor: hex }}
      />
      <div className="mt-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold leading-tight text-gray-900">
            {name}
          </p>
          <p className="mt-0.5 text-[11px] font-medium leading-none text-gray-500">
            {hex}
          </p>
        </div>
        {note && (
          <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium leading-none text-gray-500">
            {note}
          </span>
        )}
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
    <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
      {(["admin", "student"] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "rounded-full px-4 py-2 text-xs font-semibold leading-none transition-colors",
            role === r
              ? "bg-periwinkle-600 text-white"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
          )}
        >
          {r === "admin" ? "원장" : "준비생"}
        </button>
      ))}
    </div>
  );
}

function LayoutPreview({
  role,
  userName,
}: {
  role: UserRole;
  userName: string | null;
}) {
  const items = getNavItemsForRole(role);

  return (
    <div className="overflow-hidden rounded-4xl border border-gray-200 bg-bg p-3 shadow-sm">
      <AppShell userRole={role} userName={userName} previewPathname="/dashboard">
        <div className="space-y-3 p-5">
          <div>
            <p className="inline-flex rounded-full border border-periwinkle-200 bg-white px-3 py-1 text-xs font-medium leading-none text-periwinkle-700">
              {role === "admin" ? "admin navigation" : "student navigation"}
            </p>
            <h3 className="mt-3 text-2xl font-extrabold leading-[1.1] tracking-tight text-gray-900">
              Speech-M 운영 아일랜드
            </h3>
            <p className="mt-1 max-w-xl text-sm font-medium leading-tight text-gray-500">
              PC는 왼쪽 SideRail, 모바일은 하단 BottomTab을 사용합니다. 포인트 컬러는 주요
              액션과 active state에만 제한합니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["등록 공고", "128"],
              ["AI 검토", "34"],
              ["스터디", "8"],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardBody className="p-4">
                  <span className="block h-1.5 w-1.5 rounded-full bg-periwinkle-600" />
                  <p className="mt-2 text-xs font-medium leading-none text-gray-500">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold leading-[1.1] tracking-tight text-gray-900">
                    {value}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              visible menu
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {items.map((item) => (
                <Badge key={item.href} tone={item.href === "/dashboard" ? "accent" : "neutral"}>
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
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

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 rounded-4xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-3 py-1 text-xs font-semibold leading-none text-periwinkle-700">
              Speech-M Design System
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-tight text-gray-900">
              Periwinkle 토큰 고정안
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-tight text-gray-500">
              D2E0FB를 키 컬러로 두고, 액션은 periwinkle-600으로 명도를 보강했습니다. 화면
              비율은 배경/표면 6, 텍스트 3, 포인트 1을 기준으로 검수합니다.
            </p>
          </div>
          <RoleToggle role={role} onChange={setRole} />
        </header>

        <Section
          title="Periwinkle Scale"
          description="실제 hue 이름을 스케일 이름으로 사용합니다. key/primary 같은 역할명은 alias에서만 씁니다."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {periwinkleTokens.map(([step, hex, note]) => (
              <TokenSwatch key={step} name={`periwinkle-${step}`} hex={hex} note={note} />
            ))}
          </div>
        </Section>

        <Section title="Gray Scale" description="텍스트와 선은 cool gray로 통일합니다.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {grayTokens.map(([step, hex]) => (
              <TokenSwatch key={step} name={`gray-${step}`} hex={hex} />
            ))}
          </div>
        </Section>

        <Section
          title="Primitives"
          description="큰 도형보다 얇은 선, 라벨 박스, 타이트한 행간으로 강조합니다."
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>채용 공고 검토</CardTitle>
                <CardDescription>카드, 버튼, 뱃지의 기본 조합입니다.</CardDescription>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button>Primary action</Button>
                  <Button variant="soft">Soft action</Button>
                  <Button variant="ghost">Ghost action</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>neutral</Badge>
                  <Badge tone="accent">periwinkle</Badge>
                  <Badge tone="warn">warn</Badge>
                  <Badge tone="success">success</Badge>
                </div>
                <ListRow
                  icon={<HugeiconsIcon icon={Briefcase01Icon} size={18} color="currentColor" />}
                  title="KBS 아나운서 공채"
                  subtitle="마감 D-3 · 서울 · AI 적합"
                  trailing={<Badge tone="accent">검토</Badge>}
                />
                <ListRow
                  icon={
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={18}
                      color="currentColor"
                    />
                  }
                  title="내부 게시 완료"
                  subtitle="네이버 공유 준비됨"
                  trailing={<Badge tone="success">완료</Badge>}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>라벨 기반 선택</CardTitle>
                <CardDescription>포인트 컬러는 선택 상태에만 씁니다.</CardDescription>
              </CardHeader>
              <CardBody className="space-y-3">
                <OptionPill selected>periwinkle-600 / selected</OptionPill>
                <OptionPill>gray border / default</OptionPill>
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold leading-none text-gray-500">
                    타이포 기준
                  </p>
                  <p className="mt-2 text-2xl font-extrabold leading-[1.1] tracking-tight text-gray-900">
                    Tight leading
                  </p>
                  <p className="mt-1 text-sm font-medium leading-tight text-gray-500">
                    본문은 leading-tight, 긴 설명은 leading-snug까지만 사용합니다.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </Section>

        <Section
          title="Responsive AppShell"
          description="역할별 메뉴와 PC island / 모바일 bottom tab 구조를 확인합니다."
        >
          <LayoutPreview role={role} userName={userName} />
        </Section>
      </div>
    </div>
  );
}
