/**
 * 릴레이 스터디 신청 상태를 화면별로 조립하는 데이터 로더입니다.
 * 학생의 최근 신청과 관리자의 pending 신청 큐를 Supabase에서 읽어 UI 친화 타입으로 변환합니다.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { Database, StudyApplicationStatus } from "@/types/database.types";
import { getDisplayName } from "./relay";

type StudyApplicationRow = Database["public"]["Tables"]["study_applications"]["Row"];
type StudyGroupRow = Database["public"]["Tables"]["study_groups"]["Row"];
type UserProfileRow = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "user_id" | "email" | "display_name" | "real_name"
>;

type StudentStudyApplicationRow = Pick<
  StudyApplicationRow,
  "id" | "group_id" | "message" | "status" | "requested_at" | "resolved_at"
>;

type PendingStudyApplicationRow = Pick<
  StudyApplicationRow,
  "id" | "student_user_id" | "message" | "requested_at"
>;

const UNKNOWN_USER_DISPLAY_NAME = "이름 미설정";

export type StudentStudyApplication = {
  id: string;
  groupId: string | null;
  groupTitle: string | null;
  message: string;
  status: StudyApplicationStatus;
  requestedAt: string;
  resolvedAt: string | null;
} | null;

export type AdminStudyApplicationItem = {
  id: string;
  studentUserId: string;
  studentEmail: string | null;
  studentName: string;
  message: string;
  requestedAt: string;
};

export async function getStudentStudyApplication(
  userId: string | null
): Promise<StudentStudyApplication> {
  if (!userId) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("study_applications")
    .select("id,group_id,message,status,requested_at,resolved_at")
    .eq("student_user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const application = data as StudentStudyApplicationRow | null;
  if (!application) return null;

  const groupTitle = application.group_id
    ? await getStudyGroupTitle(application.group_id)
    : null;

  return {
    id: application.id,
    groupId: application.group_id,
    groupTitle,
    message: application.message,
    status: application.status,
    requestedAt: application.requested_at,
    resolvedAt: application.resolved_at,
  };
}

export async function getPendingStudyApplications(): Promise<AdminStudyApplicationItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("study_applications")
    .select("id,student_user_id,message,requested_at")
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
    .returns<PendingStudyApplicationRow[]>();

  if (error) throw error;

  const applications = data ?? [];
  const profiles = await getProfilesByUserId(
    applications.map((application) => application.student_user_id)
  );

  return applications.map((application) => ({
    id: application.id,
    studentUserId: application.student_user_id,
    studentEmail: profiles.get(application.student_user_id)?.email ?? null,
    studentName: displayName(application.student_user_id, profiles),
    message: application.message,
    requestedAt: application.requested_at,
  }));
}

export async function getPendingStudyApplicationCount() {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("study_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return { count: count ?? 0, hasError: Boolean(error) };
}

async function getStudyGroupTitle(groupId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("study_groups")
    .select("id,title")
    .eq("id", groupId)
    .maybeSingle();

  const group = data as Pick<StudyGroupRow, "id" | "title"> | null;
  return group?.title ?? null;
}

async function getProfilesByUserId(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueUserIds.length === 0) return new Map<string, UserProfileRow>();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id, email, display_name, real_name")
    .in("user_id", uniqueUserIds);

  return new Map(((data ?? []) as UserProfileRow[]).map((profile) => [profile.user_id, profile]));
}

function displayName(userId: string, profiles: Map<string, UserProfileRow>) {
  const profile = profiles.get(userId);
  return getDisplayName({
    fallback: profile?.email ?? UNKNOWN_USER_DISPLAY_NAME,
    displayName: profile?.real_name ?? profile?.display_name ?? userId,
  });
}
