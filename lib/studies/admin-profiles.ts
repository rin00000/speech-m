import { createAdminClient } from "@/lib/supabase/server";
import { getDisplayName } from "./relay";

const UNKNOWN_USER_DISPLAY_NAME = "이름 미설정";

export type StudyAdminProfile = {
  userId: string;
  email: string | null;
  displayName: string;
  realName: string | null;
  role: "student";
};

export async function getStudentProfiles(): Promise<StudyAdminProfile[]> {
  const supabase = createAdminClient();
  const [
    { data: studentRows, error: studentRowsError },
    { data: profileRows, error: profileRowsError },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, role")
      .eq("role", "student")
      .eq("status", "active"),
    supabase.from("user_profiles").select("user_id, email, display_name, real_name"),
  ]);

  if (studentRowsError) throw studentRowsError;
  if (profileRowsError) throw profileRowsError;

  const profilesByUserId = new Map((profileRows ?? []).map((profile) => [profile.user_id, profile]));

  return (studentRows ?? [])
    .map((student) => {
      const profile = profilesByUserId.get(student.id);
      return {
        userId: student.id,
        email: profile?.email ?? null,
        displayName: getDisplayName({
          fallback: profile?.email ?? UNKNOWN_USER_DISPLAY_NAME,
          displayName: profile?.real_name ?? profile?.display_name,
        }),
        realName: profile?.real_name ?? null,
        role: "student" as const,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
}
