import { AdminLayoutGate } from "@/components/admin/layout/admin-layout-gate";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyUnreadNotifications } from "@/lib/notifications/data";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const role = user?.role ?? "guest";
  const name = user?.name ?? null;
  const email = user?.email ?? null;

  const notifications = user ? await getMyUnreadNotifications(user.userId) : [];

  return (
    <AdminLayoutGate
      isAuthenticated={!!user}
      userEmail={email}
      userName={name}
      userRole={role}
      notifications={notifications}
    >
      {children}
    </AdminLayoutGate>
  );
}
