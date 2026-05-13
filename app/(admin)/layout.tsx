import { AdminShell } from "@/components/admin/layout/admin-shell";
import { requireUser } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <AdminShell userName={user.name} userRole={user.role}>
      {children}
    </AdminShell>
  );
}
