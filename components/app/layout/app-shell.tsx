"use client";

import type { ReactNode } from "react";
import type { UserRole } from "@/lib/auth/session";
import { BottomTab } from "./bottom-tab";
import { SideRail } from "./side-rail";

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
    <div className="flex min-h-screen bg-stone-50 md:gap-4 md:p-4">
      {!hideNav && (
        <SideRail
          userRole={userRole}
          userName={userName}
          previewPathname={previewPathname}
        />
      )}

      <main
        className="flex min-h-screen min-w-0 flex-1 flex-col pb-24 md:min-h-[calc(100vh-2rem)] md:rounded-3xl md:border md:border-zinc-200/50 md:bg-white md:pb-0 md:shadow-sm"
      >
        {children}
      </main>

      {!hideNav && (
        <BottomTab userRole={userRole} previewPathname={previewPathname} />
      )}
    </div>
  );
}
