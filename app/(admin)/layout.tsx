import { AdminLayoutGate } from "@/components/admin/layout/admin-layout-gate";
import { requireUser } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <AdminLayoutGate userName={user.name} userRole={user.role}>
      {children}
    </AdminLayoutGate>
  );
}
