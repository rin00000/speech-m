"use server";

/**
 * 릴레이 스터디 Server Action 호환용 barrel.
 * 실제 구현은 관리자 그룹 액션과 수강생 제출 액션 파일로 분리되어 있다.
 */

export {
  createStudyGroup,
  createStudyQuest,
  saveStudyGroupMembers,
  updateStudyGroup,
} from "./_actions/study-group-actions";
export {
  createStudyAudioUploadTarget,
  submitRelayFeedbackAndSubmission,
  submitRelayFinalFeedback,
  submitRelayFirstSubmission,
} from "./_actions/relay-submit-actions";
