"use server";

/**
 * 관리자용 릴레이 스터디 그룹/멤버/퀘스트 Server Actions.
 * 수강생 제출 액션과 분리해 운영 화면 변경 범위를 작게 유지한다.
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import {
  groupSchema,
  questSchema,
  updateGroupSchema,
  uuidSchema,
  type ActionResult,
} from "./action-schemas";
import { requireAdminActor } from "./relay-action-helpers";

export async function createStudyGroup(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const parsed = groupSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("study_groups")
    .insert({
      type: "relay",
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      created_by: actor.data.email,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "스터디 그룹을 만들지 못했습니다." };

  revalidatePath("/studies");
  return { success: true, data: { id: data.id } };
}

export async function updateStudyGroup(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const groupIdParsed = uuidSchema.safeParse(groupId);
  if (!groupIdParsed.success) return { success: false, error: "스터디 ID가 올바르지 않습니다." };

  const parsed = updateGroupSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("study_groups")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      status: parsed.data.status,
    })
    .eq("id", groupIdParsed.data);

  if (error) return { success: false, error: "스터디 그룹을 저장하지 못했습니다." };

  revalidatePath("/studies");
  revalidatePath(`/studies/${groupIdParsed.data}`);
  return { success: true, data: undefined };
}

export async function saveStudyGroupMembers(
  groupId: string,
  studentEmails: string[],
): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const groupIdParsed = uuidSchema.safeParse(groupId);
  if (!groupIdParsed.success) return { success: false, error: "스터디 ID가 올바르지 않습니다." };

  const uniqueEmails = [...new Set(studentEmails.map((email) => email.trim()).filter(Boolean))];
  const supabase = createAdminClient();

  if (uniqueEmails.length > 0) {
    const { data: validStudents } = await supabase
      .from("user_profiles")
      .select("email")
      .in("email", uniqueEmails)
      .eq("role", "student");

    const validStudentEmails = new Set((validStudents ?? []).map((student) => student.email));
    if (uniqueEmails.some((email) => !validStudentEmails.has(email))) {
      return { success: false, error: "정회원 수강생만 스터디 멤버로 추가할 수 있습니다." };
    }
  }

  const { error: deleteError } = await supabase
    .from("study_group_members")
    .delete()
    .eq("group_id", groupIdParsed.data);

  if (deleteError) return { success: false, error: "기존 멤버 목록을 갱신하지 못했습니다." };

  if (uniqueEmails.length > 0) {
    const { error: insertError } = await supabase.from("study_group_members").insert(
      uniqueEmails.map((email, index) => ({
        group_id: groupIdParsed.data,
        student_email: email,
        display_order: index + 1,
      })),
    );

    if (insertError) return { success: false, error: "스터디 멤버를 저장하지 못했습니다." };
  }

  revalidatePath("/studies");
  revalidatePath(`/studies/${groupIdParsed.data}`);
  return { success: true, data: undefined };
}

export async function createStudyQuest(
  groupId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const groupIdParsed = uuidSchema.safeParse(groupId);
  if (!groupIdParsed.success) return { success: false, error: "스터디 ID가 올바르지 않습니다." };

  const parsed = questSchema.safeParse({
    scriptTitle: formData.get("scriptTitle"),
    scriptContent: formData.get("scriptContent"),
    dueAt: formData.get("dueAt"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  }

  const dueAt = new Date(parsed.data.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    return { success: false, error: "마감일 형식이 올바르지 않습니다." };
  }

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("study_group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupIdParsed.data);

  if ((count ?? 0) < 2) {
    return { success: false, error: "릴레이 퀘스트는 멤버가 2명 이상일 때 만들 수 있습니다." };
  }

  const { data, error } = await supabase
    .from("study_quests")
    .insert({
      group_id: groupIdParsed.data,
      script_title: parsed.data.scriptTitle,
      script_content: parsed.data.scriptContent,
      due_at: dueAt.toISOString(),
      created_by: actor.data.email,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "퀘스트 원고를 저장하지 못했습니다." };

  revalidatePath("/studies");
  revalidatePath(`/studies/${groupIdParsed.data}`);
  return { success: true, data: { id: data.id } };
}
