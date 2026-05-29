"use server";

/**
 * 릴레이 스터디 관리/제출 Server Actions.
 * 모든 mutation은 서버에서 역할과 멤버십을 다시 검증한 뒤 Supabase에 반영한다.
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import { STUDY_AUDIO_BUCKET } from "@/lib/studies/constants";
import {
  buildRelayQuestState,
  getDisplayName,
  validateStudyAudioFileMeta,
  type RelaySubmission,
  type StudyMember,
} from "@/lib/studies/relay";
import type { Database } from "@/types/database.types";

type StudyGroupMemberRow = Database["public"]["Tables"]["study_group_members"]["Row"];
type RelaySubmissionRow = Database["public"]["Tables"]["study_relay_submissions"]["Row"];
type RelayFeedbackRow = Database["public"]["Tables"]["study_relay_feedback"]["Row"];

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

const uuidSchema = z.string().uuid();

const groupSchema = z.object({
  title: z.string().trim().min(1, "스터디 제목을 입력하세요.").max(80),
  description: z.string().trim().max(300).optional(),
});

const updateGroupSchema = groupSchema.extend({
  status: z.enum(["active", "archived"]),
});

const questSchema = z.object({
  scriptTitle: z.string().trim().min(1, "원고 제목을 입력하세요.").max(120),
  scriptContent: z.string().trim().min(1, "원고 내용을 입력하세요.").max(12000),
  dueAt: z.string().trim().min(1, "마감일을 입력하세요."),
});

const uploadTargetSchema = z.object({
  questId: uuidSchema,
  fileName: z.string().trim().min(1),
  sizeBytes: z.number().int().positive(),
  contentType: z.string().trim().optional(),
});

const uploadedAudioSchema = uploadTargetSchema.extend({
  audioPath: z.string().trim().min(1),
});

const feedbackAndUploadSchema = uploadedAudioSchema.extend({
  targetSubmissionId: uuidSchema,
  comment: z.string().trim().min(1, "피드백 코멘트를 입력하세요.").max(1000),
});

const finalFeedbackSchema = z.object({
  questId: uuidSchema,
  targetSubmissionId: uuidSchema,
  comment: z.string().trim().min(1, "피드백 코멘트를 입력하세요.").max(1000),
});

const relayRpcErrorMessages: Record<string, string> = {
  relay_quest_not_open: "열려 있는 퀘스트를 찾을 수 없습니다.",
  relay_member_required: "스터디 멤버만 제출할 수 있습니다.",
  relay_already_started: "이미 릴레이가 시작된 퀘스트입니다.",
  relay_first_submission_required: "첫 제출은 피드백 없이 시작해야 합니다.",
  relay_final_feedback_required: "모든 멤버가 제출했습니다. 마지막 원형 피드백만 남았습니다.",
  relay_student_already_submitted: "이미 이번 퀘스트에 제출한 학생입니다.",
  relay_pending_submission_mismatch: "현재 피드백 대기 음성이 아닙니다.",
  relay_self_feedback_not_allowed: "자신의 음성에는 릴레이 피드백을 남길 수 없습니다.",
  relay_not_all_submitted: "아직 모든 멤버가 제출하지 않았습니다.",
  relay_first_uploader_required: "첫 업로더만 마지막 원형 피드백을 남길 수 있습니다.",
};

export async function createStudyGroup(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const parsed = groupSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };

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
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };

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
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };

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

export async function createStudyAudioUploadTarget(
  input: z.input<typeof uploadTargetSchema>,
): Promise<ActionResult<{ path: string; token: string; contentType: string }>> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = uploadTargetSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "업로드 정보를 확인하세요." };

  const fileValidation = validateStudyAudioFileMeta(parsed.data);
  if (!fileValidation.ok) return { success: false, error: fileValidation.error };

  const state = await getQuestRelayState(parsed.data.questId, actor.data.email);
  if (!state.success) return state;
  if (!state.data.canStart && !state.data.canFeedbackAndUpload) {
    return { success: false, error: "현재 업로드할 수 있는 릴레이 순서가 아닙니다." };
  }

  const audioPath = createAudioPath({
    questId: parsed.data.questId,
    studentEmail: actor.data.email,
    extension: fileValidation.extension,
  });

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(STUDY_AUDIO_BUCKET)
    .createSignedUploadUrl(audioPath);

  if (error || !data?.token) {
    return { success: false, error: "업로드 URL을 발급하지 못했습니다." };
  }

  return {
    success: true,
    data: {
      path: data.path,
      token: data.token,
      contentType: fileValidation.contentType,
    },
  };
}

export async function submitRelayFirstSubmission(
  input: z.input<typeof uploadedAudioSchema>,
): Promise<ActionResult> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = uploadedAudioSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "제출 정보를 확인하세요." };

  const audio = validateUploadedAudioInput(parsed.data, actor.data.email);
  if (!audio.success) return audio;

  const groupId = await getQuestGroupId(parsed.data.questId);
  if (!groupId) return { success: false, error: "퀘스트를 찾을 수 없습니다." };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("submit_relay_first_submission", {
    p_quest_id: parsed.data.questId,
    p_student_email: actor.data.email,
    p_audio_path: parsed.data.audioPath,
    p_audio_file_name: parsed.data.fileName,
    p_audio_content_type: audio.data.contentType,
    p_audio_size_bytes: parsed.data.sizeBytes,
  });

  if (error) {
    await removeUploadedAudio(parsed.data.audioPath);
    return { success: false, error: getRelayRpcErrorMessage(error.message, "첫 음성 제출에 실패했습니다.") };
  }

  revalidateStudyPaths(groupId);
  return { success: true, data: undefined };
}

export async function submitRelayFeedbackAndSubmission(
  input: z.input<typeof feedbackAndUploadSchema>,
): Promise<ActionResult> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = feedbackAndUploadSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "제출 정보를 확인하세요." };

  const audio = validateUploadedAudioInput(parsed.data, actor.data.email);
  if (!audio.success) return audio;

  const groupId = await getQuestGroupId(parsed.data.questId);
  if (!groupId) return { success: false, error: "퀘스트를 찾을 수 없습니다." };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("submit_relay_feedback_and_submission", {
    p_quest_id: parsed.data.questId,
    p_student_email: actor.data.email,
    p_target_submission_id: parsed.data.targetSubmissionId,
    p_comment: parsed.data.comment,
    p_audio_path: parsed.data.audioPath,
    p_audio_file_name: parsed.data.fileName,
    p_audio_content_type: audio.data.contentType,
    p_audio_size_bytes: parsed.data.sizeBytes,
  });

  if (error) {
    await removeUploadedAudio(parsed.data.audioPath);
    return { success: false, error: getRelayRpcErrorMessage(error.message, "릴레이 제출에 실패했습니다.") };
  }

  revalidateStudyPaths(groupId);
  return { success: true, data: undefined };
}

export async function submitRelayFinalFeedback(
  input: z.input<typeof finalFeedbackSchema>,
): Promise<ActionResult> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = finalFeedbackSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "피드백 정보를 확인하세요." };

  const groupId = await getQuestGroupId(parsed.data.questId);
  if (!groupId) return { success: false, error: "퀘스트를 찾을 수 없습니다." };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("submit_relay_final_feedback", {
    p_quest_id: parsed.data.questId,
    p_student_email: actor.data.email,
    p_target_submission_id: parsed.data.targetSubmissionId,
    p_comment: parsed.data.comment,
  });

  if (error) {
    return { success: false, error: getRelayRpcErrorMessage(error.message, "마지막 피드백 제출에 실패했습니다.") };
  }

  revalidateStudyPaths(groupId);
  return { success: true, data: undefined };
}

async function requireAdminActor(): Promise<ActionResult<{ email: string }>> {
  const user = await getCurrentUser();
  if (!user?.email || user.role !== "admin") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }
  return { success: true, data: { email: user.email } };
}

async function requireStudentActor(): Promise<ActionResult<{ email: string }>> {
  const user = await getCurrentUser();
  if (!user?.email || user.role !== "student") {
    return { success: false, error: "정회원 수강생만 이용할 수 있습니다." };
  }
  return { success: true, data: { email: user.email } };
}

async function getQuestRelayState(questId: string, currentUserEmail: string) {
  const supabase = createAdminClient();
  const { data: quest } = await supabase
    .from("study_quests")
    .select("id, group_id, status")
    .eq("id", questId)
    .maybeSingle();

  if (!quest) return { success: false as const, error: "퀘스트를 찾을 수 없습니다." };

  const [{ data: memberRows }, { data: submissionRows }] = await Promise.all([
    supabase
      .from("study_group_members")
      .select("student_email, display_order")
      .eq("group_id", quest.group_id)
      .order("display_order", { ascending: true }),
    supabase
      .from("study_relay_submissions")
      .select("*")
      .eq("quest_id", questId)
      .order("sequence_number", { ascending: true }),
  ]);

  const submissionIds = ((submissionRows ?? []) as RelaySubmissionRow[]).map((submission) => submission.id);
  const { data: feedbackRows } =
    submissionIds.length > 0
      ? await supabase
          .from("study_relay_feedback")
          .select("*")
          .in("submission_id", submissionIds)
      : { data: [] };

  const members = ((memberRows ?? []) as Pick<StudyGroupMemberRow, "student_email" | "display_order">[]).map<StudyMember>((member) => ({
    email: member.student_email,
    displayName: getDisplayName({ email: member.student_email }),
    displayOrder: member.display_order,
  }));
  const feedbackBySubmissionId = new Map(
    ((feedbackRows ?? []) as RelayFeedbackRow[]).map((feedback) => [
      feedback.submission_id,
      feedback,
    ]),
  );
  const submissions = ((submissionRows ?? []) as RelaySubmissionRow[]).map<RelaySubmission>((submission) => {
    const feedback = feedbackBySubmissionId.get(submission.id);
    return {
      id: submission.id,
      questId: submission.quest_id,
      studentEmail: submission.student_email,
      studentName: getDisplayName({ email: submission.student_email }),
      audioPath: submission.audio_path,
      audioUrl: null,
      audioFileName: submission.audio_file_name,
      audioContentType: submission.audio_content_type,
      audioSizeBytes: submission.audio_size_bytes,
      sequenceNumber: submission.sequence_number,
      submittedAt: submission.submitted_at,
      audioDeletedAt: submission.audio_deleted_at,
      feedback: feedback
        ? {
            id: feedback.id,
            submissionId: feedback.submission_id,
            authorEmail: feedback.feedback_author_email,
            authorName: getDisplayName({ email: feedback.feedback_author_email }),
            comment: feedback.comment,
            createdAt: feedback.created_at,
          }
        : null,
    };
  });

  return {
    success: true as const,
    data: buildRelayQuestState({
      members,
      submissions,
      currentUserEmail,
      questStatus: quest.status,
    }),
  };
}

function validateUploadedAudioInput(
  input: z.infer<typeof uploadedAudioSchema>,
  studentEmail: string,
): ActionResult<{ contentType: string }> {
  const fileValidation = validateStudyAudioFileMeta(input);
  if (!fileValidation.ok) return { success: false, error: fileValidation.error };

  const expectedPrefix = `relay/${input.questId}/${safeStorageSegment(studentEmail)}/`;
  if (!input.audioPath.startsWith(expectedPrefix)) {
    return { success: false, error: "업로드 경로가 현재 제출자와 일치하지 않습니다." };
  }

  return { success: true, data: { contentType: fileValidation.contentType } };
}

async function getQuestGroupId(questId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("study_quests")
    .select("group_id")
    .eq("id", questId)
    .maybeSingle();

  return data?.group_id ?? null;
}

function createAudioPath({
  questId,
  studentEmail,
  extension,
}: {
  questId: string;
  studentEmail: string;
  extension: "mp3" | "m4a" | "wav";
}) {
  return `relay/${questId}/${safeStorageSegment(studentEmail)}/${randomUUID()}.${extension}`;
}

function safeStorageSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
}

async function removeUploadedAudio(audioPath: string) {
  const supabase = createAdminClient();
  await supabase.storage.from(STUDY_AUDIO_BUCKET).remove([audioPath]);
}

function revalidateStudyPaths(groupId: string) {
  revalidatePath("/studies");
  revalidatePath(`/studies/${groupId}`);
}

function getRelayRpcErrorMessage(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  return relayRpcErrorMessages[message.trim()] ?? fallback;
}
