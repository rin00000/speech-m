"use server";

/**
 * 수강생 릴레이 음성 업로드/피드백 제출 Server Actions.
 * 관리자 그룹 관리 액션과 분리해 업로드 검증과 RPC 제출 흐름만 담는다.
 */

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import {
  STUDY_AUDIO_BUCKET,
  STUDY_AUDIO_SIGNED_URL_TTL_SECONDS,
} from "@/lib/studies/constants";
import { validateStudyAudioFileMeta } from "@/lib/studies/relay";
import type { Database } from "@/types/database.types";
import {
  feedbackAndUploadSchema,
  finalFeedbackSchema,
  uploadedAudioSchema,
  uploadTargetSchema,
  uuidSchema,
  type ActionResult,
} from "./action-schemas";
import {
  createAudioPath,
  getQuestRelayState,
  getRelayRpcErrorMessage,
  removeUploadedAudio,
  requireStudentActor,
  requireOpenQuestBeforeDue,
  revalidateStudyPaths,
  validateUploadedAudioInput,
} from "./relay-action-helpers";

type RelaySubmissionAudioAccessRow = Pick<
  Database["public"]["Tables"]["study_relay_submissions"]["Row"],
  "id" | "quest_id" | "student_user_id" | "audio_path" | "audio_deleted_at"
>;
type StudyQuestGroupRow = Pick<Database["public"]["Tables"]["study_quests"]["Row"], "group_id">;

export async function createStudyAudioUploadTarget(
  input: z.input<typeof uploadTargetSchema>,
): Promise<ActionResult<{ path: string; token: string; contentType: string }>> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = uploadTargetSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "업로드 정보를 확인하세요." };

  const fileValidation = validateStudyAudioFileMeta(parsed.data);
  if (!fileValidation.ok) return { success: false, error: fileValidation.error };

  const questGuard = await requireOpenQuestBeforeDue(parsed.data.questId);
  if (!questGuard.success) return questGuard;

  const state = await getQuestRelayState(parsed.data.questId, actor.data.userId);
  if (!state.success) return state;
  if (!state.data.canStart && !state.data.canFeedbackAndUpload) {
    return { success: false, error: "현재 업로드할 수 있는 릴레이 순서가 아닙니다." };
  }

  const audioPath = createAudioPath({
    questId: parsed.data.questId,
    studentUserId: actor.data.userId,
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

export async function getRelaySubmissionAudioUrl(
  submissionId: string,
): Promise<ActionResult<{ audioUrl: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "로그인이 필요합니다." };

  const parsed = uuidSchema.safeParse(submissionId);
  if (!parsed.success) {
    return { success: false, error: "오디오 제출 ID가 올바르지 않습니다." };
  }

  const supabase = createAdminClient();
  const { data: submissionData, error: submissionError } = await supabase
    .from("study_relay_submissions")
    .select("id, quest_id, student_user_id, audio_path, audio_deleted_at")
    .eq("id", parsed.data)
    .maybeSingle();

  if (submissionError) {
    return { success: false, error: "오디오 정보를 확인하지 못했습니다." };
  }

  const submission = submissionData as RelaySubmissionAudioAccessRow | null;
  if (!submission || submission.audio_deleted_at) {
    return { success: false, error: "재생할 오디오를 찾을 수 없습니다." };
  }

  const { data: questData, error: questError } = await supabase
    .from("study_quests")
    .select("group_id")
    .eq("id", submission.quest_id)
    .maybeSingle();

  const quest = questData as StudyQuestGroupRow | null;
  if (questError || !quest) {
    return { success: false, error: "스터디 정보를 확인하지 못했습니다." };
  }

  if (user.role !== "admin") {
    const { data: member, error: memberError } = await supabase
      .from("study_group_members")
      .select("student_user_id")
      .eq("group_id", quest.group_id)
      .eq("student_user_id", user.userId)
      .maybeSingle();

    if (memberError || !member) {
      return { success: false, error: "스터디 오디오를 볼 권한이 없습니다." };
    }
  }

  const { data, error } = await supabase.storage
    .from(STUDY_AUDIO_BUCKET)
    .createSignedUrl(submission.audio_path, STUDY_AUDIO_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return { success: false, error: "오디오 재생 URL을 발급하지 못했습니다." };
  }

  return { success: true, data: { audioUrl: data.signedUrl } };
}

export async function submitRelayFirstSubmission(
  input: z.input<typeof uploadedAudioSchema>,
): Promise<ActionResult> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = uploadedAudioSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "제출 정보를 확인하세요." };

  const audio = validateUploadedAudioInput(parsed.data, actor.data.userId);
  if (!audio.success) return audio;

  const questGuard = await requireOpenQuestBeforeDue(parsed.data.questId);
  if (!questGuard.success) {
    await removeUploadedAudio(parsed.data.audioPath);
    return questGuard;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("submit_relay_first_submission", {
    p_quest_id: parsed.data.questId,
    p_student_user_id: actor.data.userId,
    p_audio_path: parsed.data.audioPath,
    p_audio_file_name: parsed.data.fileName,
    p_audio_content_type: audio.data.contentType,
    p_audio_size_bytes: parsed.data.sizeBytes,
  });

  if (error) {
    await removeUploadedAudio(parsed.data.audioPath);
    return {
      success: false,
      error: getRelayRpcErrorMessage(error.message, "첫 음성 제출에 실패했습니다."),
    };
  }

  revalidateStudyPaths(questGuard.data.groupId);
  return { success: true, data: undefined };
}

export async function submitRelayFeedbackAndSubmission(
  input: z.input<typeof feedbackAndUploadSchema>,
): Promise<ActionResult> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = feedbackAndUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "제출 정보를 확인하세요." };
  }

  const audio = validateUploadedAudioInput(parsed.data, actor.data.userId);
  if (!audio.success) return audio;

  const questGuard = await requireOpenQuestBeforeDue(parsed.data.questId);
  if (!questGuard.success) {
    await removeUploadedAudio(parsed.data.audioPath);
    return questGuard;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("submit_relay_feedback_and_submission", {
    p_quest_id: parsed.data.questId,
    p_student_user_id: actor.data.userId,
    p_target_submission_id: parsed.data.targetSubmissionId,
    p_comment: parsed.data.comment,
    p_audio_path: parsed.data.audioPath,
    p_audio_file_name: parsed.data.fileName,
    p_audio_content_type: audio.data.contentType,
    p_audio_size_bytes: parsed.data.sizeBytes,
  });

  if (error) {
    await removeUploadedAudio(parsed.data.audioPath);
    return {
      success: false,
      error: getRelayRpcErrorMessage(error.message, "릴레이 제출에 실패했습니다."),
    };
  }

  revalidateStudyPaths(questGuard.data.groupId);
  return { success: true, data: undefined };
}

export async function submitRelayFinalFeedback(
  input: z.input<typeof finalFeedbackSchema>,
): Promise<ActionResult> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = finalFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "피드백 정보를 확인하세요." };
  }

  const questGuard = await requireOpenQuestBeforeDue(parsed.data.questId);
  if (!questGuard.success) return questGuard;

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("submit_relay_final_feedback", {
    p_quest_id: parsed.data.questId,
    p_student_user_id: actor.data.userId,
    p_target_submission_id: parsed.data.targetSubmissionId,
    p_comment: parsed.data.comment,
  });

  if (error) {
    return {
      success: false,
      error: getRelayRpcErrorMessage(error.message, "마지막 피드백 제출에 실패했습니다."),
    };
  }

  revalidateStudyPaths(questGuard.data.groupId);
  return { success: true, data: undefined };
}
