import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
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
import {
  relayRpcErrorMessages,
  uploadedAudioSchema,
  type ActionResult,
} from "./action-schemas";

type StudyGroupMemberRow = Database["public"]["Tables"]["study_group_members"]["Row"];
type RelaySubmissionRow = Database["public"]["Tables"]["study_relay_submissions"]["Row"];
type RelayFeedbackRow = Database["public"]["Tables"]["study_relay_feedback"]["Row"];
type UserProfileRow = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "user_id" | "email" | "display_name" | "real_name"
>;

export async function requireAdminActor(): Promise<ActionResult<{ userId: string }>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }
  return { success: true, data: { userId: user.userId } };
}

export async function requireStudentActor(): Promise<
  ActionResult<{ userId: string; realName: string }>
> {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return { success: false, error: "정회원 수강생만 이용할 수 있습니다." };
  }
  const realName = user.realName?.trim();
  if (!realName) {
    return { success: false, error: "스터디 참여 전에 실명을 먼저 저장해주세요." };
  }
  return { success: true, data: { userId: user.userId, realName } };
}

export async function getQuestRelayState(questId: string, currentUserId: string) {
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
      .select("student_user_id, display_order")
      .eq("group_id", quest.group_id)
      .order("display_order", { ascending: true }),
    supabase
      .from("study_relay_submissions")
      .select("*")
      .eq("quest_id", questId)
      .order("sequence_number", { ascending: true }),
  ]);

  const submissionIds = ((submissionRows ?? []) as RelaySubmissionRow[]).map(
    (submission) => submission.id
  );
  const { data: feedbackRows } =
    submissionIds.length > 0
      ? await supabase
          .from("study_relay_feedback")
          .select("*")
          .in("submission_id", submissionIds)
      : { data: [] };

  const participantUserIds = [
    ...new Set([
      ...((memberRows ?? []) as Pick<StudyGroupMemberRow, "student_user_id">[]).map(
        (member) => member.student_user_id
      ),
      ...((submissionRows ?? []) as RelaySubmissionRow[]).map(
        (submission) => submission.student_user_id
      ),
      ...((feedbackRows ?? []) as RelayFeedbackRow[]).map(
        (feedback) => feedback.feedback_author_user_id
      ),
    ]),
  ];
  const profiles = await getProfilesByUserId(participantUserIds);

  const members = (
    (memberRows ?? []) as Pick<StudyGroupMemberRow, "student_user_id" | "display_order">[]
  ).map<StudyMember>((member) => ({
    userId: member.student_user_id,
    email: profiles.get(member.student_user_id)?.email ?? null,
    displayName: displayName(member.student_user_id, profiles),
    displayOrder: member.display_order,
  }));
  const feedbackBySubmissionId = new Map(
    ((feedbackRows ?? []) as RelayFeedbackRow[]).map((feedback) => [
      feedback.submission_id,
      feedback,
    ])
  );
  const submissions = ((submissionRows ?? []) as RelaySubmissionRow[]).map<RelaySubmission>(
    (submission) => {
      const feedback = feedbackBySubmissionId.get(submission.id);
      return {
        id: submission.id,
        questId: submission.quest_id,
        studentUserId: submission.student_user_id,
        studentEmail: profiles.get(submission.student_user_id)?.email ?? null,
        studentName: displayName(submission.student_user_id, profiles),
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
              authorUserId: feedback.feedback_author_user_id,
              authorEmail: profiles.get(feedback.feedback_author_user_id)?.email ?? null,
              authorName: displayName(feedback.feedback_author_user_id, profiles),
              comment: feedback.comment,
              createdAt: feedback.created_at,
            }
          : null,
      };
    }
  );

  return {
    success: true as const,
    data: buildRelayQuestState({
      members,
      submissions,
      currentUserId,
      questStatus: quest.status,
    }),
  };
}

export function validateUploadedAudioInput(
  input: z.infer<typeof uploadedAudioSchema>,
  studentUserId: string
): ActionResult<{ contentType: string }> {
  const fileValidation = validateStudyAudioFileMeta(input);
  if (!fileValidation.ok) return { success: false, error: fileValidation.error };

  const expectedPrefix = `relay/${input.questId}/${safeStorageSegment(studentUserId)}/`;
  if (!input.audioPath.startsWith(expectedPrefix)) {
    return { success: false, error: "업로드 경로가 현재 제출자와 일치하지 않습니다." };
  }

  return { success: true, data: { contentType: fileValidation.contentType } };
}

export async function getQuestGroupId(questId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("study_quests")
    .select("group_id")
    .eq("id", questId)
    .maybeSingle();

  return data?.group_id ?? null;
}

export function createAudioPath({
  questId,
  studentUserId,
  extension,
}: {
  questId: string;
  studentUserId: string;
  extension: "mp3" | "m4a" | "wav";
}) {
  return `relay/${questId}/${safeStorageSegment(studentUserId)}/${randomUUID()}.${extension}`;
}

export async function removeUploadedAudio(audioPath: string) {
  const supabase = createAdminClient();
  await supabase.storage.from(STUDY_AUDIO_BUCKET).remove([audioPath]);
}

export function revalidateStudyPaths(groupId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/studies");
  revalidatePath(`/studies/${groupId}`);
}

export function getRelayRpcErrorMessage(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  return relayRpcErrorMessages[message.trim()] ?? fallback;
}

async function getProfilesByUserId(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueUserIds.length === 0) return new Map<string, UserProfileRow>();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id, email, display_name, real_name")
    .in("user_id", uniqueUserIds);

  return new Map(((data ?? []) as UserProfileRow[]).map((profile) => [profile.user_id, profile]));
}

function displayName(userId: string, profiles: Map<string, UserProfileRow>) {
  const profile = profiles.get(userId);
  return getDisplayName({
    fallback: profile?.email ?? userId,
    displayName: profile?.real_name ?? profile?.display_name,
  });
}

function safeStorageSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
}
