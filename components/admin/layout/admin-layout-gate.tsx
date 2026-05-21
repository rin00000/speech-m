"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/app/layout/app-shell";
import type { UserRole } from "@/lib/auth/session";

export function AdminLayoutGate({
  children,
  userName,
  userRole,
}: {
  children: ReactNode;
  userName: string | null;
  userRole: UserRole;
}) {
  return (
    <AppShell userName={userName} userRole={userRole}>
      {children}
    </AppShell>
  );
}
