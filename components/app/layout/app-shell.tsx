"use client";

"use client";

/**
 * 앱 최상위 Shell 컴포넌트.
 * 사이드바(SideRail), 하단 탭(BottomTab), 개발용 RoleSimulator를 포함.
 * LoadingProvider로 전체를 감싸 Server Action 버튼이 글로벌 Progress Bar와 연동되도록 한다.
 */

import type { ReactNode } from "react";
import type { UserRole } from "@/lib/auth/session";
import { LoadingProvider, useLoading } from "@/lib/ui/loading-context";
import { BottomTab } from "./bottom-tab";
import { SideRail } from "./side-rail";
import { RoleSimulator } from "./role-simulator";
import { cn } from "@/lib/ui/cn";

function AppShellContent({
  children,
  userRole,
  userName,
  previewPathname,
  hideNav,
}: {
  children: ReactNode;
  userRole: UserRole;
  userName?: string | null;
  previewPathname?: string;
  hideNav: boolean;
}) {
  const { isNavigating } = useLoading();

  return (
    <div className="flex min-h-screen md:gap-4 md:p-4">
      {!hideNav && (
        <SideRail
          userRole={userRole}
          userName={userName}
          previewPathname={previewPathname}
        />
      )}

      <main
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col pb-24 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:border md:border-gray-200 md:bg-white md:pb-0 md:shadow-sm overflow-hidden transition-opacity duration-200",
          isNavigating ? "opacity-40 pointer-events-none" : "opacity-100"
        )}
      >
        {children}
      </main>

      {!hideNav && (
        <BottomTab userRole={userRole} previewPathname={previewPathname} />
      )}

      {/* 개발 모드 전용 등급 권한 시뮬레이터 */}
      <RoleSimulator />
    </div>
  );
}

export function AppShell({
  children,
  userRole,
  userName,
  previewPathname,
  hideNav = false,
}: {
  children: ReactNode;
  userRole: UserRole;
  userName?: string | null;
  previewPathname?: string;
  hideNav?: boolean;
}) {
  return (
    <LoadingProvider>
      <AppShellContent
        userRole={userRole}
        userName={userName}
        previewPathname={previewPathname}
        hideNav={hideNav}
      >
        {children}
      </AppShellContent>
    </LoadingProvider>
  );
}
