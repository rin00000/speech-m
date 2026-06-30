"use client";

import { TransitionLink } from "@/components/ui/transition-link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import type { UserRole } from "@/lib/auth/session";
import type { UserNotification } from "@/lib/notifications/data";
import { cn } from "@/lib/ui/cn";
import { getNavItemsForRole, isNavActive } from "./nav-items";
import { LogoutButton } from "./logout-button";
import { NotificationBell } from "./notification-bell";

export function SideRail({
  userRole,
  userName,
  userEmail,
  isAuthenticated,
  previewPathname,
  notifications = [],
}: {
  userRole: UserRole;
  userName?: string | null;
  userEmail?: string | null;
  isAuthenticated?: boolean;
  previewPathname?: string;
  notifications?: UserNotification[];
}) {
  const pathname = usePathname();
  const activePath = previewPathname ?? pathname;
  const items = getNavItemsForRole(userRole).filter((item) => item.href !== "/settings");
  
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const groupLabels: Record<string, string> = {
    main: "메인",
    learning: "나의 학습",
    management: "운영 관리",
    system: "시스템",
  };
  
  const groupOrder = ["main", "learning", "management", "system"];

  const displayName = userName ?? userEmail ?? "User";
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const isSettingsActive = activePath.startsWith("/settings");
  const roleLabel =
    userRole === "admin" ? "관리자" : userRole === "student" ? "수강생" : "게스트";

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        profileMenuRef.current &&
        event.target instanceof Node &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isProfileMenuOpen]);

  return (
    <aside className="hidden h-full w-[88px] shrink-0 flex-col rounded-3xl border border-gray-200 bg-white shadow-sm md:flex lg:w-[240px]">
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 lg:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-periwinkle-600 text-xs font-bold text-white">
            SM
          </div>
          <div className="hidden min-w-0 flex-col leading-none lg:flex">
            <span className="truncate text-sm font-extrabold text-gray-900">Speech-M</span>
            <span className="truncate text-[11px] font-medium text-gray-500">
              {roleLabel}
            </span>
          </div>
        </div>
        {isAuthenticated && (
          <NotificationBell initialNotifications={notifications} />
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {groupOrder.map((groupId) => {
          const groupItems = groupedItems[groupId];
          if (!groupItems || groupItems.length === 0) return null;

          return (
            <div key={groupId} className="flex flex-col gap-1">
              <div className="hidden lg:block mb-1 px-3">
                <span className="text-xs font-bold text-gray-400">{groupLabels[groupId]}</span>
              </div>
              {groupId !== "main" && (
                <div className="mx-2 mb-2 border-t border-gray-100 lg:hidden" />
              )}
              {groupItems.map((item) => {
                const active = isNavActive(activePath, item.href);
                return (
                  <TransitionLink
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold leading-tight transition-colors",
                      active
                        ? "border-periwinkle-200 bg-periwinkle-100 text-periwinkle-700"
                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                    )}
                    title={item.label}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                        active ? "bg-white text-periwinkle-700" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
                      )}
                    >
                      <HugeiconsIcon
                        icon={item.icon}
                        size={18}
                        color="currentColor"
                        strokeWidth={active ? 2 : 1.5}
                      />
                    </span>
                    <span className="hidden truncate lg:inline">{item.label}</span>
                  </TransitionLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {isAuthenticated && (
        <div
          ref={profileMenuRef}
          className="relative shrink-0 border-t border-gray-200 p-3 lg:p-4"
          onMouseEnter={() => setIsProfileMenuOpen(true)}
          onMouseLeave={() => setIsProfileMenuOpen(false)}
        >
          {isProfileMenuOpen && (
            <div className="absolute bottom-[calc(100%-0.25rem)] left-3 z-50 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm lg:left-4 lg:right-4 lg:w-auto">
              {userRole !== "guest" && (
                <TransitionLink
                  href="/settings"
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold leading-none transition-colors",
                    isSettingsActive
                      ? "bg-periwinkle-100 text-periwinkle-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                  title="설정"
                >
                  <HugeiconsIcon
                    icon={Settings01Icon}
                    size={16}
                    color="currentColor"
                    strokeWidth={isSettingsActive ? 2 : 1.6}
                  />
                  <span>설정</span>
                </TransitionLink>
              )}

              <div className="mt-1 border-t border-gray-100 pt-1">
                <LogoutButton variant="ghost" className="shadow-none" />
              </div>
            </div>
          )}

          <div className="flex justify-center lg:hidden">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl border text-xs font-bold shadow-sm transition-colors",
                isProfileMenuOpen || isSettingsActive
                  ? "border-periwinkle-200 bg-periwinkle-100 text-periwinkle-700"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50",
              )}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label="계정 메뉴 열기"
              title="계정 메뉴"
            >
              {(displayName[0] ?? "U").toUpperCase()}
            </button>
          </div>

          <div className="hidden space-y-3 lg:block">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                isProfileMenuOpen || isSettingsActive
                  ? "border-periwinkle-200 bg-periwinkle-50"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100/70",
              )}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-periwinkle-200 bg-periwinkle-100 text-xs font-bold text-periwinkle-700">
                {(displayName[0] ?? "U").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-gray-800">{displayName}</p>
                <p className="truncate text-[11px] font-medium leading-tight text-gray-500">
                  {roleLabel}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
