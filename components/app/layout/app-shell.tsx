"use client";

import type { ReactNode } from "react";
import type { UserRole } from "@/lib/auth/session";
import { BottomTab } from "./bottom-tab";
import { SideRail } from "./side-rail";
import { RoleSimulator } from "./role-simulator";

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
    <div className="flex min-h-screen md:gap-4 md:p-4">
      {!hideNav && (
        <SideRail
          userRole={userRole}
          userName={userName}
          previewPathname={previewPathname}
        />
      )}

      <main
        className="flex min-h-screen min-w-0 flex-1 flex-col pb-24 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:border md:border-gray-200 md:bg-white md:pb-0 md:shadow-sm"
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
