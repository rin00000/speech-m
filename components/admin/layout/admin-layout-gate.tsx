"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/admin/layout/admin-shell";
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
  const pathname = usePathname();
  const isPrototype = pathname.startsWith("/prototype");

  if (isPrototype) {
    return <>{children}</>;
  }

  return (
    <AdminShell userName={userName} userRole={userRole}>
      {children}
    </AdminShell>
  );
}
