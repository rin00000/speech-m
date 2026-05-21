import { AdminLayoutGate } from "@/components/admin/layout/admin-layout-gate";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const role = user?.role ?? "guest";
  const name = user?.name ?? null;

  return (
    <AdminLayoutGate userName={name} userRole={role}>
      {children}
    </AdminLayoutGate>
  );
}
