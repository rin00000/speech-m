"use client";

/**
 * 프로토타입 카탈로그의 상단 소개와 페르소나 전환 컨트롤.
 * 테마 편집 영역과 분리해 헤더 메시지 수정 범위를 작게 유지한다.
 */

import type { UserRole } from "@/lib/auth/session";
import { cn } from "@/lib/ui/cn";

type PrototypeHeroProps = {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
};

export function PrototypeHero({ role, onRoleChange }: PrototypeHeroProps) {
  return (
    <header className="flex flex-col gap-6 rounded-4xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-3 py-1 text-xs font-semibold leading-none text-periwinkle-700">
            Speech-M UI Playground
          </span>
          <span className="inline-flex animate-pulse rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold leading-none text-amber-700">
            실시간 샌드박스
          </span>
        </div>
        <h1 className="pt-2 text-3xl font-extrabold leading-[1.05] tracking-tight text-gray-900">
          트렌디 큐레이션 실험실
        </h1>
        <p className="max-w-2xl text-sm font-medium leading-tight text-gray-500">
          미니멀리즘 속의 트렌디함. 테마별 5대 프리셋과 스타일 조합을 즉석에서 검토해
          보세요. 마음에 드는 조합의 코드도 즉시 복사 가능합니다.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <p className="text-xs font-semibold text-gray-400">페르소나 전환</p>
        <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
          {(["admin", "student"] as const).map((nextRole) => (
            <button
              key={nextRole}
              type="button"
              onClick={() => onRoleChange(nextRole)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold leading-none transition-colors",
                role === nextRole
                  ? "bg-periwinkle-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-white hover:text-gray-800",
              )}
            >
              {nextRole === "admin" ? "원장 대시보드" : "준비생 메인"}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
