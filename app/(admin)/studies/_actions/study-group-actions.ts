"use server";

/**
 * 릴레이 스터디 그룹과 퀘스트를 관리하는 Server Action 모듈입니다.
 * 관리자 권한 확인 후 group/quest 입력 스키마와 멤버 UUID 목록을 검증하고 Supabase에 저장합니다.
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { STUDY_AUDIO_BUCKET } from "@/lib/studies/constants";
import type { Database } from "@/types/database.types";
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
type StudyGroupDeleteRow = Pick<Database["public"]["Tables"]["study_groups"]["Row"], "id" | "status">;
type StudyQuestDeleteRow = Pick<Database["public"]["Tables"]["study_quests"]["Row"], "id">;
type RelaySubmissionAudioRow = Pick<
  Database["public"]["Tables"]["study_relay_submissions"]["Row"],
  "audio_path"
>;

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

export async function deleteStudyGroup(groupId: string): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const groupIdParsed = uuidSchema.safeParse(groupId);
  if (!groupIdParsed.success) return { success: false, error: "스터디 ID가 올바르지 않습니다." };

  const supabase = createAdminClient();
  const { data: group, error: groupError } = await supabase
    .from("study_groups")
    .select("id, status")
    .eq("id", groupIdParsed.data)
    .eq("type", "relay")
    .maybeSingle();

  if (groupError) return { success: false, error: "스터디 정보를 확인하지 못했습니다." };

  const targetGroup = group as StudyGroupDeleteRow | null;
  if (!targetGroup) return { success: false, error: "삭제할 스터디를 찾을 수 없습니다." };
  if (targetGroup.status !== "archived") {
    return { success: false, error: "보관 상태인 스터디만 영구 삭제할 수 있습니다." };
  }

  const { data: questRows, error: questError } = await supabase
    .from("study_quests")
    .select("id")
    .eq("group_id", groupIdParsed.data);

  if (questError) return { success: false, error: "스터디 퀘스트를 확인하지 못했습니다." };

  const questIds = ((questRows ?? []) as StudyQuestDeleteRow[]).map((quest) => quest.id);
  const audioPaths =
    questIds.length === 0
      ? []
      : await getStudyAudioPathsForDeletion(supabase, questIds);

  if (!Array.isArray(audioPaths)) return audioPaths;

  const { data: deletedGroup, error: deleteError } = await supabase
    .from("study_groups")
    .delete()
    .eq("id", groupIdParsed.data)
    .eq("type", "relay")
    .eq("status", "archived")
    .select("id")
    .maybeSingle();

  if (deleteError) return { success: false, error: "스터디를 삭제하지 못했습니다." };
  if (!deletedGroup) {
    return { success: false, error: "삭제 조건이 변경되었습니다. 목록을 새로고침한 뒤 다시 시도해주세요." };
  }

  if (audioPaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(STUDY_AUDIO_BUCKET)
      .remove(audioPaths);

    if (removeError) {
      console.error("[studies] failed to delete study audio after group deletion", {
        groupId: groupIdParsed.data,
        error: removeError,
      });
    }
  }

  revalidatePath("/dashboard");
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

async function getStudyAudioPathsForDeletion(
  supabase: ReturnType<typeof createAdminClient>,
  questIds: string[]
): Promise<string[] | ActionResult> {
  const { data: submissionRows, error: submissionError } = await supabase
    .from("study_relay_submissions")
    .select("audio_path")
    .in("quest_id", questIds);

  if (submissionError) {
    return { success: false, error: "스터디 음성 파일 목록을 확인하지 못했습니다." };
  }

  return [
    ...new Set(
      ((submissionRows ?? []) as RelaySubmissionAudioRow[])
        .map((submission) => submission.audio_path)
        .filter(Boolean)
    ),
  ];
}
