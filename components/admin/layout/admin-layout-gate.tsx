"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/app/layout/app-shell";
import type { UserRole } from "@/lib/auth/session";
import type { UserNotification } from "@/lib/notifications/data";

export function AdminLayoutGate({
  children,
  userName,
  userEmail,
  userRole,
  isAuthenticated,
  notifications,
}: {
  children: ReactNode;
  userName: string | null;
  userEmail?: string | null;
  userRole: UserRole;
  isAuthenticated?: boolean;
  notifications?: UserNotification[];
}) {
  return (
    <AppShell
      isAuthenticated={isAuthenticated}
      userEmail={userEmail}
      userName={userName}
      userRole={userRole}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
