"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function updateUserRole(email: string, newRole: "admin" | "student" | "guest") {
  try {
    const actor = await getCurrentUser();
    // 수행자가 관리자(admin)인지 반드시 재검증
    if (!actor || actor.role !== "admin") {
      return { success: false, error: "권한이 없습니다. 관리자만 이용할 수 있습니다." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("user_profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("email", email);

    if (error) {
      console.error("Error updating user role:", error);
      return { success: false, error: "데이터베이스 업데이트 중 오류가 발생했습니다." };
    }

    revalidatePath("/users");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("updateUserRole unexpected error:", err);
    return { success: false, error: "서버 내부 오류가 발생했습니다." };
  }
}
