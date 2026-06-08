/**
 * 로그인 상태와 역할에 따라 관리자·수강생·게스트 대시보드를 분기하는 서버 컴포넌트입니다.
 * 각 뷰에 필요한 데이터 로더를 호출해 UI 컴포넌트에는 렌더링용 props만 전달합니다.
 */

import { AdminDashboardView } from "@/components/admin/dashboard/admin-dashboard-view";
import { GuestDashboardView } from "@/components/admin/dashboard/guest-dashboard-view";
import { StudentDashboardView } from "@/components/admin/dashboard/student-dashboard-view";
import { getCurrentUser } from "@/lib/auth/session";
import { getGuestDashboardData } from "@/lib/dashboard/guest-dashboard";
import { getStudentDashboardData } from "@/lib/studies/student-dashboard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    const dashboardData = await getGuestDashboardData({ userId: null, isLoggedIn: false });
    return <GuestDashboardView userName={null} isLoggedIn={false} data={dashboardData} />;
  }

  if (user.role === "admin") {
    return <AdminDashboardView />;
  }

  if (user.role === "student") {
    const dashboardData = await getStudentDashboardData(user.userId);
    return <StudentDashboardView userName={user.name} data={dashboardData} />;
  }

  const dashboardData = await getGuestDashboardData({ userId: user.userId, isLoggedIn: true });
  return <GuestDashboardView userName={user.name} isLoggedIn data={dashboardData} />;
}
