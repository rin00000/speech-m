"use server";

/**
 * 사용자 관리 화면의 권한 변경 Server Action 모듈입니다.
 * getCurrentUser와 createAdminClient로 관리자 권한을 확인하고 변경 후 /users, /dashboard를 재검증합니다.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser, type UserRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";

type ActionResult = {
  success: boolean;
  error?: string;
};

export async function updateUserRole(userId: string, newRole: UserRole): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor || actor.role !== "admin") {
      return { success: false, error: "관리자만 권한을 변경할 수 있습니다." };
    }

    if (newRole !== "admin" && userId === actor.userId) {
      return { success: false, error: "본인의 관리자 권한은 해제할 수 없습니다." };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("id");

    if (error) {
      console.error("Error updating user role:", error);
      return { success: false, error: "사용자 권한을 저장하지 못했습니다." };
    }
    if (!data || data.length === 0) {
      return { success: false, error: "대상 사용자를 찾을 수 없습니다." };
    }

    revalidatePath("/users");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("updateUserRole unexpected error:", error);
    return { success: false, error: "서버 오류가 발생했습니다." };
  }
}

export async function updateMultipleUsersRoles(
  userIds: string[],
  newRole: UserRole
): Promise<ActionResult> {
  try {
    const actor = await getCurrentUser();
    if (!actor || actor.role !== "admin") {
      return { success: false, error: "관리자만 권한을 변경할 수 있습니다." };
    }

    const dedupedUserIds = [...new Set(userIds)];

    if (dedupedUserIds.length === 0) {
      return { success: false, error: "변경할 사용자를 선택해주세요." };
    }

    if (newRole !== "admin" && dedupedUserIds.includes(actor.userId)) {
      return { success: false, error: "본인의 관리자 권한은 해제할 수 없습니다." };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .in("id", dedupedUserIds)
      .select("id");

    if (error) {
      console.error("Error updating multiple user roles:", error);
      return { success: false, error: "사용자 권한을 저장하지 못했습니다." };
    }
    if (!data || data.length !== dedupedUserIds.length) {
      return { success: false, error: "일부 대상 사용자를 찾을 수 없습니다." };
    }

    revalidatePath("/users");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("updateMultipleUsersRoles unexpected error:", error);
    return { success: false, error: "서버 오류가 발생했습니다." };
  }
}
