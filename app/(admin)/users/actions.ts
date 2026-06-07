/**
 * @file actions.ts
 * @description 회원 권한 관리(/users) 탭에서 사용하는 서버 액션 모듈입니다.
 * 단일 회원 권한 업데이트 및 다중 회원의 권한을 일괄 업데이트하는 백엔드 데이터베이스 작업을 처리합니다.
 */

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

/**
 * 여러 사용자의 역할을 일괄 업데이트합니다.
 * @param emails 역할을 변경할 사용자들의 이메일 배열
 * @param newRole 새로 지정할 역할
 */
export async function updateMultipleUsersRoles(emails: string[], newRole: "admin" | "student" | "guest") {
  try {
    const actor = await getCurrentUser();
    // 수행자가 관리자(admin)인지 반드시 재검증
    if (!actor || actor.role !== "admin") {
      return { success: false, error: "권한이 없습니다. 관리자만 이용할 수 있습니다." };
    }

    if (!emails || emails.length === 0) {
      return { success: false, error: "변경할 대상자가 선택되지 않았습니다." };
    }

    if (newRole !== "admin" && emails.includes(actor.email)) {
      return { success: false, error: "자기 자신의 관리자 권한은 일괄 해제할 수 없습니다." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("user_profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .in("email", emails);

    if (error) {
      console.error("Error updating multiple user roles:", error);
      return { success: false, error: "데이터베이스 일괄 업데이트 중 오류가 발생했습니다." };
    }

    revalidatePath("/users");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("updateMultipleUsersRoles unexpected error:", err);
    return { success: false, error: "서버 내부 오류가 발생했습니다." };
  }
}

