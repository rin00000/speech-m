"use server";

/**
 * 릴레이 스터디 Server Action 호환용 barrel.
 * 실제 구현은 관리자 그룹 액션과 수강생 제출 액션 파일로 분리되어 있다.
 */

import {
  createStudyGroup as createStudyGroupAction,
  createStudyQuest as createStudyQuestAction,
  deleteStudyGroup as deleteStudyGroupAction,
  saveStudyGroupMembers as saveStudyGroupMembersAction,
  updateStudyGroup as updateStudyGroupAction,
} from "./_actions/study-group-actions";
import {
  approveStudyApplication as approveStudyApplicationAction,
  rejectStudyApplication as rejectStudyApplicationAction,
  submitStudyApplication as submitStudyApplicationAction,
} from "./_actions/study-application-actions";
import {
  createStudyAudioUploadTarget as createStudyAudioUploadTargetAction,
  getRelaySubmissionAudioUrl as getRelaySubmissionAudioUrlAction,
  submitRelayFeedbackAndSubmission as submitRelayFeedbackAndSubmissionAction,
  submitRelayFinalFeedback as submitRelayFinalFeedbackAction,
  submitRelayFirstSubmission as submitRelayFirstSubmissionAction,
} from "./_actions/relay-submit-actions";
import {
  saveStudyRealName as saveStudyRealNameAction,
} from "./_actions/study-profile-actions";

export async function createStudyGroup(formData: FormData) {
  return createStudyGroupAction(formData);
}

export async function updateStudyGroup(groupId: string, formData: FormData) {
  return updateStudyGroupAction(groupId, formData);
}

export async function deleteStudyGroup(groupId: string) {
  return deleteStudyGroupAction(groupId);
}

export async function saveStudyGroupMembers(groupId: string, studentUserIds: string[]) {
  return saveStudyGroupMembersAction(groupId, studentUserIds);
}

export async function createStudyQuest(groupId: string, formData: FormData) {
  return createStudyQuestAction(groupId, formData);
}

export async function submitStudyApplication(message?: string) {
  return submitStudyApplicationAction(message);
}

export async function approveStudyApplication(applicationId: string, groupId: string) {
  return approveStudyApplicationAction(applicationId, groupId);
}

export async function rejectStudyApplication(applicationId: string) {
  return rejectStudyApplicationAction(applicationId);
}

export async function saveStudyRealName(
  studyId: string,
  prevState: Parameters<typeof saveStudyRealNameAction>[1],
  formData: FormData,
) {
  return saveStudyRealNameAction(studyId, prevState, formData);
}

export async function createStudyAudioUploadTarget(
  input: Parameters<typeof createStudyAudioUploadTargetAction>[0],
) {
  return createStudyAudioUploadTargetAction(input);
}

export async function getRelaySubmissionAudioUrl(
  submissionId: Parameters<typeof getRelaySubmissionAudioUrlAction>[0],
) {
  return getRelaySubmissionAudioUrlAction(submissionId);
}

export async function submitRelayFirstSubmission(
  input: Parameters<typeof submitRelayFirstSubmissionAction>[0],
) {
  return submitRelayFirstSubmissionAction(input);
}

export async function submitRelayFeedbackAndSubmission(
  input: Parameters<typeof submitRelayFeedbackAndSubmissionAction>[0],
) {
  return submitRelayFeedbackAndSubmissionAction(input);
}

export async function submitRelayFinalFeedback(
  input: Parameters<typeof submitRelayFinalFeedbackAction>[0],
) {
  return submitRelayFinalFeedbackAction(input);
}
