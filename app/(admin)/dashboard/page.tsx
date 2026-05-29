import { AdminDashboardView } from "@/components/admin/dashboard/admin-dashboard-view";
import { GuestDashboardView } from "@/components/admin/dashboard/guest-dashboard-view";
import { StudentDashboardView } from "@/components/admin/dashboard/student-dashboard-view";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <GuestDashboardView userName={null} email="" isLoggedIn={false} />;
  }

  if (user.role === "admin") {
    return <AdminDashboardView />;
  }

  if (user.role === "student") {
    return <StudentDashboardView userName={user.name} />;
  }

  return <GuestDashboardView userName={user.name} email={user.email} isLoggedIn />;
}
