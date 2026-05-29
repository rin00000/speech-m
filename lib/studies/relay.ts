/**
 * 릴레이 스터디 진행 상태 계산과 음성 파일 정책 검증.
 * UI와 Server Action이 같은 규칙을 공유하도록 DB 접근 없는 순수 로직만 둔다.
 */

import {
  STUDY_AUDIO_ALLOWED_EXTENSIONS,
  STUDY_AUDIO_ALLOWED_MIME_TYPES,
  STUDY_AUDIO_MAX_SIZE_BYTES,
} from "./constants";
import type { UserRole } from "@/lib/auth/session";

export type StudyMember = {
  email: string;
  displayName: string;
  displayOrder: number;
};

export type RelayFeedback = {
  id: string;
  submissionId: string;
  authorEmail: string;
  authorName: string;
  comment: string;
  createdAt: string;
};

export type RelaySubmission = {
  id: string;
  questId: string;
  studentEmail: string;
  studentName: string;
  audioPath: string;
  audioUrl: string | null;
  audioFileName: string;
  audioContentType: string;
  audioSizeBytes: number;
  sequenceNumber: number;
  submittedAt: string;
  audioDeletedAt: string | null;
  feedback: RelayFeedback | null;
};

export type RelayQuestStatus = "not_started" | "waiting_feedback" | "waiting_final_feedback" | "completed";

export type RelayQuestState = {
  status: RelayQuestStatus;
  members: StudyMember[];
  submissions: RelaySubmission[];
  completedSubmissions: RelaySubmission[];
  pendingSubmission: RelaySubmission | null;
  unsubmittedMembers: StudyMember[];
  firstSubmission: RelaySubmission | null;
  userSubmission: RelaySubmission | null;
  canStart: boolean;
  canFeedbackAndUpload: boolean;
  canFinalFeedback: boolean;
  isComplete: boolean;
};

export type StudyViewer = {
  email: string | null;
  role: UserRole;
};

export type StudyAudioValidationResult =
  | { ok: true; extension: "mp3" | "m4a" | "wav"; contentType: string }
  | { ok: false; error: string };

export function canViewStudy({
  viewer,
  memberEmails,
}: {
  viewer: StudyViewer;
  memberEmails: string[];
}) {
  if (viewer.role === "admin") return true;
  if (!viewer.email || viewer.role !== "student") return false;
  return memberEmails.includes(viewer.email);
}

export function getDisplayName({
  email,
  displayName,
}: {
  email: string;
  displayName?: string | null;
}) {
  const trimmed = displayName?.trim();
  return trimmed || email;
}

export function buildRelayQuestState({
  members,
  submissions,
  currentUserEmail,
  questStatus,
}: {
  members: StudyMember[];
  submissions: RelaySubmission[];
  currentUserEmail: string | null;
  questStatus: "open" | "closed";
}): RelayQuestState {
  const sortedMembers = [...members].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.displayName.localeCompare(b.displayName, "ko");
  });
  const sortedSubmissions = [...submissions].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const submittedEmails = new Set(sortedSubmissions.map((submission) => submission.studentEmail));
  const completedSubmissions = sortedSubmissions.filter((submission) => submission.feedback);
  const pendingSubmission =
    sortedSubmissions.find((submission) => !submission.feedback) ?? null;
  const firstSubmission = sortedSubmissions[0] ?? null;
  const userSubmission =
    currentUserEmail
      ? sortedSubmissions.find((submission) => submission.studentEmail === currentUserEmail) ?? null
      : null;
  const unsubmittedMembers = sortedMembers.filter((member) => !submittedEmails.has(member.email));
  const hasAllSubmissions =
    sortedMembers.length > 0 && sortedSubmissions.length >= sortedMembers.length;
  const isComplete =
    questStatus === "closed" ||
    (hasAllSubmissions && sortedSubmissions.every((submission) => submission.feedback));
  const isStudentMember =
    Boolean(currentUserEmail) && sortedMembers.some((member) => member.email === currentUserEmail);
  const isOpen = questStatus === "open" && !isComplete;
  const hasUserSubmitted = Boolean(userSubmission);

  const canStart =
    isOpen &&
    isStudentMember &&
    sortedSubmissions.length === 0 &&
    !hasUserSubmitted;

  const canFeedbackAndUpload =
    isOpen &&
    isStudentMember &&
    Boolean(pendingSubmission) &&
    sortedSubmissions.length > 0 &&
    sortedSubmissions.length < sortedMembers.length &&
    !hasUserSubmitted &&
    pendingSubmission?.studentEmail !== currentUserEmail;

  const canFinalFeedback =
    isOpen &&
    isStudentMember &&
    Boolean(pendingSubmission) &&
    hasAllSubmissions &&
    firstSubmission?.studentEmail === currentUserEmail &&
    pendingSubmission?.studentEmail !== currentUserEmail;

  let status: RelayQuestStatus = "not_started";
  if (isComplete) {
    status = "completed";
  } else if (pendingSubmission && hasAllSubmissions) {
    status = "waiting_final_feedback";
  } else if (pendingSubmission) {
    status = "waiting_feedback";
  }

  return {
    status,
    members: sortedMembers,
    submissions: sortedSubmissions,
    completedSubmissions,
    pendingSubmission,
    unsubmittedMembers,
    firstSubmission,
    userSubmission,
    canStart,
    canFeedbackAndUpload,
    canFinalFeedback,
    isComplete,
  };
}

export function validateStudyAudioFileMeta({
  fileName,
  sizeBytes,
  contentType,
}: {
  fileName: string;
  sizeBytes: number;
  contentType?: string | null;
}): StudyAudioValidationResult {
  const extension = getAudioExtension(fileName);
  if (!extension) {
    return { ok: false, error: "mp3, m4a, wav 파일만 업로드할 수 있습니다." };
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "음성 파일 크기를 확인할 수 없습니다." };
  }

  if (sizeBytes > STUDY_AUDIO_MAX_SIZE_BYTES) {
    return { ok: false, error: "음성 파일은 20MB 이하만 업로드할 수 있습니다." };
  }

  const normalizedContentType = normalizeStudyAudioContentType({
    extension,
    contentType,
  });

  if (!normalizedContentType) {
    return { ok: false, error: "지원하지 않는 음성 파일 형식입니다." };
  }

  return { ok: true, extension, contentType: normalizedContentType };
}

export function getAudioExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();
  if (!extension) return null;
  return STUDY_AUDIO_ALLOWED_EXTENSIONS.includes(extension as "mp3" | "m4a" | "wav")
    ? (extension as "mp3" | "m4a" | "wav")
    : null;
}

export function normalizeStudyAudioContentType({
  extension,
  contentType,
}: {
  extension: "mp3" | "m4a" | "wav";
  contentType?: string | null;
}) {
  const lower = contentType?.trim().toLowerCase();
  if (lower && (STUDY_AUDIO_ALLOWED_MIME_TYPES as readonly string[]).includes(lower)) {
    return lower;
  }

  if (extension === "mp3") return "audio/mpeg";
  if (extension === "m4a") return "audio/mp4";
  return "audio/wav";
}
