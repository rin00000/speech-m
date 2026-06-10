"use server";

/**
 * 수강생 릴레이 음성 업로드/피드백 제출 Server Actions.
 * 관리자 그룹 관리 액션과 분리해 업로드 검증과 RPC 제출 흐름만 담는다.
 */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { STUDY_AUDIO_BUCKET } from "@/lib/studies/constants";
import { validateStudyAudioFileMeta } from "@/lib/studies/relay";
import {
  feedbackAndUploadSchema,
  finalFeedbackSchema,
  uploadedAudioSchema,
  uploadTargetSchema,
  type ActionResult,
} from "./action-schemas";
import {
  createAudioPath,
  getQuestGroupId,
  getQuestRelayState,
  getRelayRpcErrorMessage,
  removeUploadedAudio,
  requireStudentActor,
  revalidateStudyPaths,
  validateUploadedAudioInput,
} from "./relay-action-helpers";

export async function createStudyAudioUploadTarget(
  input: z.input<typeof uploadTargetSchema>,
): Promise<ActionResult<{ path: string; token: string; contentType: string }>> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = uploadTargetSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "업로드 정보를 확인하세요." };

  const fileValidation = validateStudyAudioFileMeta(parsed.data);
  if (!fileValidation.ok) return { success: false, error: fileValidation.error };

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

export async function submitRelayFirstSubmission(
  input: z.input<typeof uploadedAudioSchema>,
): Promise<ActionResult> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const parsed = uploadedAudioSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "제출 정보를 확인하세요." };

  const audio = validateUploadedAudioInput(parsed.data, actor.data.userId);
  if (!audio.success) return audio;

  const groupId = await getQuestGroupId(parsed.data.questId);
  if (!groupId) return { success: false, error: "퀘스트를 찾을 수 없습니다." };

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

  revalidateStudyPaths(groupId);
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

  const groupId = await getQuestGroupId(parsed.data.questId);
  if (!groupId) return { success: false, error: "퀘스트를 찾을 수 없습니다." };

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

  revalidateStudyPaths(groupId);
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

  const groupId = await getQuestGroupId(parsed.data.questId);
  if (!groupId) return { success: false, error: "퀘스트를 찾을 수 없습니다." };

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

  revalidateStudyPaths(groupId);
  return { success: true, data: undefined };
}
