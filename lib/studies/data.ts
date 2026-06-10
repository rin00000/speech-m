/**
 * 스터디 목록/상세 화면에 필요한 데이터를 Supabase에서 조립한다.
 * private 오디오 파일은 서버에서만 signed URL을 발급해 클라이언트에 전달한다.
 */

import { createAdminClient } from "@/lib/supabase/server";
import {
  STUDY_AUDIO_BUCKET,
  STUDY_AUDIO_SIGNED_URL_TTL_SECONDS,
} from "./constants";
import {
  buildRelayQuestState,
  canViewStudy,
  getDisplayName,
  type RelayFeedback,
  type RelayQuestState,
  type RelaySubmission,
  type StudyMember,
  type StudyViewer,
} from "./relay";
import type { Database, StudyGroupStatus, StudyQuestStatus } from "@/types/database.types";
export { getStudentProfiles } from "./admin-profiles";
export type { StudyAdminProfile } from "./admin-profiles";

type StudyGroupRow = Database["public"]["Tables"]["study_groups"]["Row"];
type StudyGroupMemberRow = Database["public"]["Tables"]["study_group_members"]["Row"];
type StudyQuestRow = Database["public"]["Tables"]["study_quests"]["Row"];
type RelaySubmissionRow = Database["public"]["Tables"]["study_relay_submissions"]["Row"];
type RelayFeedbackRow = Database["public"]["Tables"]["study_relay_feedback"]["Row"];
type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

const UNKNOWN_USER_DISPLAY_NAME = "이름 미설정";

export type StudyListItem = {
  id: string;
  title: string;
  description: string;
  status: StudyGroupStatus;
  memberCount: number;
  memberUserIds: string[];
  questCount: number;
  openQuestCount: number;
  nextDueAt: string | null;
  createdAt: string;
};

export type StudyQuestDetail = {
  id: string;
  groupId: string;
  scriptTitle: string;
  scriptContent: string;
  dueAt: string;
  status: StudyQuestStatus;
  createdAt: string;
  relay: RelayQuestState;
};

export type StudyDetail = {
  group: {
    id: string;
    title: string;
    description: string;
    status: StudyGroupStatus;
    createdAt: string;
  };
  members: StudyMember[];
  quests: StudyQuestDetail[];
};

export async function getStudiesForViewer(viewer: StudyViewer): Promise<StudyListItem[]> {
  if (!viewer.userId) return [];

  const supabase = createAdminClient();
  const [{ data: groups }, { data: members }, { data: quests }] = await Promise.all([
    supabase
      .from("study_groups")
      .select("id, title, description, status, created_at")
      .eq("type", "relay")
      .order("created_at", { ascending: false }),
    supabase
      .from("study_group_members")
      .select("group_id, student_user_id"),
    supabase
      .from("study_quests")
      .select("id, group_id, status, due_at")
      .order("due_at", { ascending: true }),
  ]);

  const memberRows = (members ?? []) as Pick<StudyGroupMemberRow, "group_id" | "student_user_id">[];
  const questRows = (quests ?? []) as Pick<StudyQuestRow, "id" | "group_id" | "status" | "due_at">[];
  const visibleGroupIds =
    viewer.role === "admin"
      ? null
      : new Set(
          memberRows
            .filter((member) => member.student_user_id === viewer.userId)
            .map((member) => member.group_id),
        );

  return ((groups ?? []) as Pick<StudyGroupRow, "id" | "title" | "description" | "status" | "created_at">[])
    .filter((group) => !visibleGroupIds || visibleGroupIds.has(group.id))
    .map((group) => {
      const groupMembers = memberRows.filter((member) => member.group_id === group.id);
      const groupQuests = questRows.filter((quest) => quest.group_id === group.id);
      const openQuests = groupQuests.filter((quest) => quest.status === "open");
      return {
        id: group.id,
        title: group.title,
        description: group.description,
        status: group.status,
        memberCount: groupMembers.length,
        memberUserIds: groupMembers.map((member) => member.student_user_id),
        questCount: groupQuests.length,
        openQuestCount: openQuests.length,
        nextDueAt: openQuests[0]?.due_at ?? null,
        createdAt: group.created_at,
      };
    });
}

export async function getStudyDetail({
  studyId,
  viewer,
}: {
  studyId: string;
  viewer: StudyViewer;
}): Promise<StudyDetail | null> {
  if (!viewer.userId) return null;

  const supabase = createAdminClient();
  const { data: group } = await supabase
    .from("study_groups")
    .select("id, title, description, status, created_at")
    .eq("id", studyId)
    .eq("type", "relay")
    .maybeSingle();

  if (!group) return null;

  const [{ data: memberRows }, { data: questRows }] = await Promise.all([
    supabase
      .from("study_group_members")
      .select("id, group_id, student_user_id, display_order, created_at")
      .eq("group_id", studyId)
      .order("display_order", { ascending: true }),
    supabase
      .from("study_quests")
      .select("*")
      .eq("group_id", studyId)
      .order("due_at", { ascending: false }),
  ]);

  const members = (memberRows ?? []) as StudyGroupMemberRow[];
  const memberUserIds = members.map((member) => member.student_user_id);
  if (!canViewStudy({ viewer, memberUserIds })) return null;

  const profilesByUserId = await getProfilesByUserId(memberUserIds);
  const studyMembers = members.map((member) => ({
    userId: member.student_user_id,
    email: profilesByUserId.get(member.student_user_id)?.email ?? null,
    displayName: getDisplayName({
      fallback: profilesByUserId.get(member.student_user_id)?.email ?? UNKNOWN_USER_DISPLAY_NAME,
      displayName:
        profilesByUserId.get(member.student_user_id)?.real_name ??
        profilesByUserId.get(member.student_user_id)?.display_name,
    }),
    displayOrder: member.display_order,
  }));

  const quests = (questRows ?? []) as StudyQuestRow[];
  const questIds = quests.map((quest) => quest.id);
  const { data: submissionRows } =
    questIds.length > 0
      ? await supabase
          .from("study_relay_submissions")
          .select("*")
          .in("quest_id", questIds)
          .order("sequence_number", { ascending: true })
      : { data: [] };

  const submissions = (submissionRows ?? []) as RelaySubmissionRow[];
  const submissionIds = submissions.map((submission) => submission.id);
  const { data: feedbackRows } =
    submissionIds.length > 0
      ? await supabase
          .from("study_relay_feedback")
          .select("*")
          .in("submission_id", submissionIds)
      : { data: [] };

  const feedback = (feedbackRows ?? []) as RelayFeedbackRow[];
  const participantProfilesByUserId = await getProfilesByUserId([
    ...new Set([
      ...submissions.map((submission) => submission.student_user_id),
      ...feedback.map((item) => item.feedback_author_user_id),
      ...memberUserIds,
    ]),
  ]);
  const feedbackBySubmissionId = new Map<string, RelayFeedback>();
  feedback.forEach((item) => {
    feedbackBySubmissionId.set(item.submission_id, {
      id: item.id,
      submissionId: item.submission_id,
      authorUserId: item.feedback_author_user_id,
      authorEmail: participantProfilesByUserId.get(item.feedback_author_user_id)?.email ?? null,
      authorName: getDisplayName({
        fallback:
          participantProfilesByUserId.get(item.feedback_author_user_id)?.email ??
          UNKNOWN_USER_DISPLAY_NAME,
        displayName:
          participantProfilesByUserId.get(item.feedback_author_user_id)?.real_name ??
          participantProfilesByUserId.get(item.feedback_author_user_id)?.display_name,
      }),
      comment: item.comment,
      createdAt: item.created_at,
    });
  });

  const signedAudioUrls = await createSignedAudioUrlMap(submissions);

  const questDetails = quests.map((quest) => {
    const questSubmissions = submissions
      .filter((submission) => submission.quest_id === quest.id)
      .map<RelaySubmission>((submission) => ({
        id: submission.id,
        questId: submission.quest_id,
        studentUserId: submission.student_user_id,
        studentEmail: participantProfilesByUserId.get(submission.student_user_id)?.email ?? null,
        studentName: getDisplayName({
          fallback:
            participantProfilesByUserId.get(submission.student_user_id)?.email ??
            UNKNOWN_USER_DISPLAY_NAME,
          displayName:
            participantProfilesByUserId.get(submission.student_user_id)?.real_name ??
            participantProfilesByUserId.get(submission.student_user_id)?.display_name,
        }),
        audioPath: submission.audio_path,
        audioUrl: signedAudioUrls.get(submission.id) ?? null,
        audioFileName: submission.audio_file_name,
        audioContentType: submission.audio_content_type,
        audioSizeBytes: submission.audio_size_bytes,
        sequenceNumber: submission.sequence_number,
        submittedAt: submission.submitted_at,
        audioDeletedAt: submission.audio_deleted_at,
        feedback: feedbackBySubmissionId.get(submission.id) ?? null,
      }));

    return {
      id: quest.id,
      groupId: quest.group_id,
      scriptTitle: quest.script_title,
      scriptContent: quest.script_content,
      dueAt: quest.due_at,
      status: quest.status,
      createdAt: quest.created_at,
      relay: buildRelayQuestState({
        members: studyMembers,
        submissions: questSubmissions,
        currentUserId: viewer.role === "student" ? viewer.userId : null,
        questStatus: quest.status,
      }),
    };
  });

  return {
    group: {
      id: group.id,
      title: group.title,
      description: group.description,
      status: group.status,
      createdAt: group.created_at,
    },
    members: studyMembers,
    quests: questDetails,
  };
}

async function getProfilesByUserId(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueUserIds.length === 0) {
    return new Map<
      string,
      Pick<UserProfileRow, "user_id" | "email" | "display_name" | "real_name">
    >();
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id, email, display_name, real_name")
    .in("user_id", uniqueUserIds);

  return new Map(
    ((
      data ?? []
    ) as Pick<UserProfileRow, "user_id" | "email" | "display_name" | "real_name">[]).map((profile) => [
      profile.user_id,
      profile,
    ]),
  );
}

async function createSignedAudioUrlMap(submissions: RelaySubmissionRow[]) {
  const supabase = createAdminClient();
  const pairs = await Promise.all(
    submissions.map(async (submission) => {
      if (submission.audio_deleted_at) return [submission.id, null] as const;

      const { data, error } = await supabase.storage
        .from(STUDY_AUDIO_BUCKET)
        .createSignedUrl(submission.audio_path, STUDY_AUDIO_SIGNED_URL_TTL_SECONDS);

      if (error) return [submission.id, null] as const;
      return [submission.id, data.signedUrl] as const;
    }),
  );

  return new Map<string, string | null>(pairs);
}
