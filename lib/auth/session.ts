import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export type UserRole = "admin" | "student" | "guest";

export async function getCurrentUser() {
  // 개발용 역할 시뮬레이션 (쿠키 기반)
  try {
    const cookieStore = await cookies();
    const mockRole = cookieStore.get("mock_role")?.value;
    if (mockRole && process.env.NODE_ENV !== "production") {
      if (mockRole === "none") {
        return null; // 비로그인 모사
      }
      return {
        email: `mock-${mockRole}@speech-m.com`,
        name: mockRole === "admin" ? "모의 원장님" : mockRole === "student" ? "모의 수강생" : "모의 게스트",
        role: mockRole as UserRole,
      };
    }
  } catch (e) {
    // 빌드 정적 분석 시 에러 방지
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("role, display_name")
    .eq("email", session.user.email)
    .maybeSingle();

  return {
    email: session.user.email,
    name: data?.display_name ?? session.user.name ?? null,
    role: (data?.role as UserRole | undefined) ?? "guest",
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
