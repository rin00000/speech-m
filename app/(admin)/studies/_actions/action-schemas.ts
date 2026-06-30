/**
 * 릴레이 스터디 Server Action 입력 스키마와 공통 결과 타입.
 * 액션 본문이 검증 규칙과 에러 메시지 테이블까지 함께 들고 있지 않도록 분리한다.
 */

import { z } from "zod";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export const uuidSchema = z.string().uuid();

export const groupSchema = z.object({
  title: z.string().trim().min(1, "스터디 제목을 입력하세요.").max(80),
  description: z.string().trim().max(300).optional(),
});

export const updateGroupSchema = groupSchema.extend({
  status: z.enum(["active", "archived"]),
});

export const questSchema = z.object({
  scriptTitle: z.string().trim().min(1, "원고 제목을 입력하세요.").max(120),
  scriptContent: z.string().trim().min(1, "원고 내용을 입력하세요.").max(12000),
  dueAt: z.string().trim().min(1, "마감일을 입력하세요."),
});

export const studyApplicationMessageSchema = z
  .string()
  .trim()
  .max(500, "신청 메모는 500자 이하로 입력하세요.")
  .optional();

const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
const KOREA_TIME_ZONE_OFFSET = "+09:00";

export function parseFutureQuestDueAt(value: string, now = new Date()): ActionResult<Date> {
  const normalizedValue = DATETIME_LOCAL_PATTERN.test(value)
    ? `${value}${KOREA_TIME_ZONE_OFFSET}`
    : value;
  const dueAt = new Date(normalizedValue);
  if (Number.isNaN(dueAt.getTime())) {
    return { success: false, error: "마감일 형식이 올바르지 않습니다." };
  }

  if (dueAt.getTime() <= now.getTime()) {
    return { success: false, error: "마감일은 현재 시간 이후로 설정하세요." };
  }

  return { success: true, data: dueAt };
}

export const realNameSchema = z.object({
  realName: z.string().trim().min(2, "실명은 2자 이상 입력하세요.").max(40, "실명은 40자 이하로 입력하세요."),
});

export const uploadTargetSchema = z.object({
  questId: uuidSchema,
  fileName: z.string().trim().min(1),
  sizeBytes: z.number().int().positive(),
  contentType: z.string().trim().optional(),
});

export const uploadedAudioSchema = uploadTargetSchema.extend({
  audioPath: z.string().trim().min(1),
});

export const feedbackAndUploadSchema = uploadedAudioSchema.extend({
  targetSubmissionId: uuidSchema,
  comment: z.string().trim().min(1, "피드백 코멘트를 입력하세요.").max(1000),
});

export const finalFeedbackSchema = z.object({
  questId: uuidSchema,
  targetSubmissionId: uuidSchema,
  comment: z.string().trim().min(1, "피드백 코멘트를 입력하세요.").max(1000),
});

export const relayRpcErrorMessages: Record<string, string> = {
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

export const studyApplicationRpcErrorMessages: Record<string, string> = {
  study_application_admin_required: "관리자 권한이 필요합니다.",
  study_application_group_required: "운영 중인 릴레이 스터디를 선택하세요.",
  study_application_not_pending: "이미 처리되었거나 존재하지 않는 스터디 신청입니다.",
  study_application_student_required: "활성 정회원 수강생만 스터디 멤버로 배정할 수 있습니다.",
};
