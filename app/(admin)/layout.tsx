/**
 * 인증된 앱 영역의 공통 레이아웃을 구성하는 서버 컴포넌트입니다.
 * 현재 사용자와 알림 데이터를 조회해 AdminLayoutGate와 AppShell에 전달합니다.
 */

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

  const notifications = user ? await getMyUnreadNotifications() : [];

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
