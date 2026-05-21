"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * 1. 현재 사용자의 프로필 닉네임(display_name)을 업데이트합니다.
 */
export async function updateProfileName(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return { success: false, error: "인증되지 않은 사용자입니다. 로그인이 필요합니다." };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "닉네임은 공백일 수 없습니다." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("user_profiles")
      .update({
        display_name: trimmedName,
        updated_at: new Date().toISOString(),
      })
      .eq("email", user.email);

    if (error) {
      console.error("updateProfileName error:", error);
      return { success: false, error: `데이터베이스 업데이트 실패: ${error.message}` };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err: unknown) {
    console.error("updateProfileName exception:", err);
    const message = err instanceof Error ? err.message : "서버 내부 오류가 발생했습니다.";
    return { success: false, error: message };
  }
}

/**
 * 2. 수집 차단된 소스 URL(블랙리스트)을 해제(삭제)합니다. (Admin 전용)
 */
export async function removeBlockedUrl(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return { success: false, error: "권한이 없습니다. 관리자만 블랙리스트를 관리할 수 있습니다." };
    }

    if (!url) {
      return { success: false, error: "해제할 대상 URL이 지정되지 않았습니다." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("crawl_blocked_source_urls")
      .delete()
      .eq("source_url", url);

    if (error) {
      console.error("removeBlockedUrl error:", error);
      return { success: false, error: `블랙리스트 해제 실패: ${error.message}` };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err: unknown) {
    console.error("removeBlockedUrl exception:", err);
    const message = err instanceof Error ? err.message : "서버 내부 오류가 발생했습니다.";
    return { success: false, error: message };
  }
}

/**
 * 3. 서비스 전역 시스템 설정을 업데이트합니다. (Admin 전용)
 */
export async function updateSystemSetting(
  key: string,
  value: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return { success: false, error: "권한이 없습니다. 관리자만 시스템 설정을 수정할 수 있습니다." };
    }

    if (!key) {
      return { success: false, error: "설정 키가 유효하지 않습니다." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "key",
      });

    if (error) {
      console.error("updateSystemSetting error:", error);
      return { success: false, error: `시스템 설정 저장 실패: ${error.message}` };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err: unknown) {
    console.error("updateSystemSetting exception:", err);
    const message = err instanceof Error ? err.message : "서버 내부 오류가 발생했습니다.";
    return { success: false, error: message };
  }
}
