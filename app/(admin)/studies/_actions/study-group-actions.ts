"use server";

/**
 * 릴레이 스터디 그룹과 퀘스트를 관리하는 Server Action 모듈입니다.
 * 관리자 권한 확인 후 group/quest 입력 스키마와 멤버 UUID 목록을 검증하고 Supabase에 저장합니다.
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import {
  groupSchema,
  parseFutureQuestDueAt,
  questSchema,
  updateGroupSchema,
  uuidSchema,
  type ActionResult,
} from "./action-schemas";
import { requireAdminActor } from "./relay-action-helpers";

const studentUserIdsSchema = uuidSchema.array();

export async function createStudyGroup(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const parsed = groupSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("study_groups")
    .insert({
      type: "relay",
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      created_by_user_id: actor.data.userId,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "스터디 그룹을 만들지 못했습니다." };

  revalidatePath("/studies");
  return { success: true, data: { id: data.id } };
}

export async function updateStudyGroup(
  groupId: string,
  formData: FormData
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
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
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
  studentUserIds: string[]
): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const groupIdParsed = uuidSchema.safeParse(groupId);
  if (!groupIdParsed.success) return { success: false, error: "스터디 ID가 올바르지 않습니다." };

  const studentUserIdsParsed = studentUserIdsSchema.safeParse(studentUserIds);
  if (!studentUserIdsParsed.success) {
    return { success: false, error: "스터디 멤버 ID가 올바르지 않습니다." };
  }

  const uniqueUserIds = [...new Set(studentUserIdsParsed.data.map((userId) => userId.trim()))];
  const supabase = createAdminClient();

  if (uniqueUserIds.length > 0) {
    const { data: validStudents } = await supabase
      .from("users")
      .select("id")
      .in("id", uniqueUserIds)
      .eq("role", "student")
      .eq("status", "active");

    const validStudentUserIds = new Set((validStudents ?? []).map((student) => student.id));
    if (uniqueUserIds.some((userId) => !validStudentUserIds.has(userId))) {
      return { success: false, error: "활성 수강생만 스터디 멤버로 추가할 수 있습니다." };
    }
  }

  const { error: replaceError } = await supabase.rpc("replace_study_group_members", {
    p_group_id: groupIdParsed.data,
    p_student_user_ids: uniqueUserIds,
  });

  if (replaceError) return { success: false, error: "스터디 멤버를 저장하지 못했습니다." };

  revalidatePath("/studies");
  revalidatePath(`/studies/${groupIdParsed.data}`);
  return { success: true, data: undefined };
}

export async function createStudyQuest(
  groupId: string,
  formData: FormData
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
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const dueAt = parseFutureQuestDueAt(parsed.data.dueAt);
  if (!dueAt.success) return dueAt;

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("study_group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupIdParsed.data);

  if ((count ?? 0) < 2) {
    return { success: false, error: "릴레이 테스트는 멤버가 2명 이상이어야 만들 수 있습니다." };
  }

  const { data, error } = await supabase
    .from("study_quests")
    .insert({
      group_id: groupIdParsed.data,
      script_title: parsed.data.scriptTitle,
      script_content: parsed.data.scriptContent,
      due_at: dueAt.data.toISOString(),
      created_by_user_id: actor.data.userId,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "퀘스트 원고를 저장하지 못했습니다." };

  revalidatePath("/studies");
  revalidatePath(`/studies/${groupIdParsed.data}`);
  return { success: true, data: { id: data.id } };
}
