"use client";

/**
 * 모바일 하단 탭의 더보기 오버레이 메뉴입니다.
 * 역할별 추가 메뉴와 계정 정보를 표시하고, 공용 네비게이션 활성화 규칙을 사용합니다.
 */

import { TransitionLink } from "@/components/ui/transition-link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/ui/cn";
import { isNavActive } from "./nav-items";
import type { NavItem } from "./nav-items";
import type { UserRole } from "@/lib/auth/session";

export function MobileMoreMenu({
  isOpen,
  onClose,
  moreItems,
  userRole,
  userName,
  userEmail,
  activePath,
}: {
  isOpen: boolean;
  onClose: () => void;
  moreItems: NavItem[];
  userRole: UserRole;
  userName?: string | null;
  userEmail?: string | null;
  activePath: string;
}) {
  if (!isOpen) return null;

  const displayName = userName ?? userEmail ?? "User";
  const roleLabel =
    userRole === "admin" ? "관리자" : userRole === "student" ? "수강생" : "게스트";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white md:hidden animate-in slide-in-from-bottom-full duration-300">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-4">
        <span className="text-lg font-bold text-gray-900">전체 메뉴</span>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100"
          aria-label="메뉴 닫기"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
        <div className="mb-8 flex items-center gap-4 rounded-2xl bg-gray-50 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-periwinkle-100 text-lg font-bold text-periwinkle-700">
            {(displayName[0] ?? "U").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-gray-900">{displayName}</p>
            <p className="truncate text-sm font-medium text-gray-500">{roleLabel}</p>
          </div>
        </div>

        {moreItems.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 px-2 text-sm font-bold text-gray-400">메뉴</h3>
            <div className="flex flex-col gap-1">
              {moreItems.map((item) => {
                const active = isNavActive(activePath, item.href);
                return (
                  <TransitionLink
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-bold transition-colors",
                      active
                        ? "bg-periwinkle-50 text-periwinkle-700"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      size={22}
                      strokeWidth={active ? 2 : 1.5}
                    />
                    <span>{item.label}</span>
                  </TransitionLink>
                );
              })}
            </div>
          </div>
        )}

        {/* 하단 우측 로그아웃 버튼 영역 */}
        <div className="mt-auto flex justify-end pb-2 pt-12">
          <LogoutButton variant="soft" />
        </div>
      </div>
    </div>
  );
}
