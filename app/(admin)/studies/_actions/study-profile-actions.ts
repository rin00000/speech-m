"use server";

/**
 * 스터디 참여 전에 필요한 수강생 실명 저장 액션.
 * 공개 표시명과 분리된 운영용 실명만 갱신해 커뮤니티 닉네임 정책과 충돌하지 않게 한다.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import { realNameSchema } from "./action-schemas";

export type StudyRealNameState = {
  success: boolean;
  error?: string;
};

export async function saveStudyRealName(
  studyId: string,
  _prevState: StudyRealNameState,
  formData: FormData,
): Promise<StudyRealNameState> {
  const user = await getCurrentUser();
  if (!user?.email || user.role !== "student") {
    return { success: false, error: "수강생 계정으로 로그인해야 실명을 저장할 수 있습니다." };
  }

  const parsed = realNameSchema.safeParse({
    realName: formData.get("realName"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "실명을 확인하세요.",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({
      real_name: parsed.data.realName,
      updated_at: new Date().toISOString(),
    })
    .eq("email", user.email);

  if (error) {
    return { success: false, error: "실명을 저장하지 못했습니다." };
  }

  revalidatePath("/studies");
  revalidatePath(`/studies/${studyId}`);

  return { success: true };
}
