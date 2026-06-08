"use server";

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
  formData: FormData
): Promise<StudyRealNameState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return { success: false, error: "수강생 계정으로 로그인해야 실명을 저장할 수 있습니다." };
  }

  const parsed = realNameSchema.safeParse({
    realName: formData.get("realName"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "실명을 확인해주세요.",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({
      real_name: parsed.data.realName,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.userId);

  if (error) {
    return { success: false, error: "실명을 저장하지 못했습니다." };
  }

  revalidatePath("/studies");
  revalidatePath(`/studies/${studyId}`);

  return { success: true };
}
