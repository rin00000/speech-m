"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/app/layout/app-shell";
import type { UserRole } from "@/lib/auth/session";

export function AdminLayoutGate({
  children,
  userName,
  userEmail,
  userRole,
  isAuthenticated,
}: {
  children: ReactNode;
  userName: string | null;
  userEmail?: string | null;
  userRole: UserRole;
  isAuthenticated?: boolean;
}) {
  return (
    <AppShell
      isAuthenticated={isAuthenticated}
      userEmail={userEmail}
      userName={userName}
      userRole={userRole}
    >
      {children}
    </AppShell>
  );
}
