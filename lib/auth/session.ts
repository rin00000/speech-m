import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { createAdminClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "student";

export async function getCurrentUser() {
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
    role: (data?.role as UserRole | undefined) ?? "student",
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
