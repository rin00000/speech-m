/**
 * 스터디 관리자 화면에서 쓰는 수강생 프로필 조회 로직.
 * 목록/상세 데이터 조립 파일이 관리자 선택지 조회까지 함께 들고 있지 않도록 분리한다.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { getDisplayName } from "./relay";

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

export type StudyAdminProfile = {
  email: string;
  displayName: string;
  role: "admin" | "student" | "guest";
};

export async function getStudentProfiles(): Promise<StudyAdminProfile[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("email, display_name, role")
    .eq("role", "student")
    .order("display_name", { ascending: true });

  return ((data ?? []) as Pick<UserProfileRow, "email" | "display_name" | "role">[]).map(
    (profile) => ({
      email: profile.email,
      displayName: getDisplayName({
        email: profile.email,
        displayName: profile.display_name,
      }),
      role: profile.role,
    }),
  );
}
