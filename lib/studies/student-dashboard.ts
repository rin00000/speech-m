/**
 * 정회원 수강생 대시보드에 필요한 스터디/연습 요약 데이터를 계산한다.
 * 상세 화면과 같은 릴레이 상태 규칙을 사용하되 마지막 원형 피드백은 대시보드 할 일에서 제외한다.
 */

import { createAdminClient } from "@/lib/supabase/server";
import {
  getStudentManagementClassDashboard,
  type StudentManagementClassNotice,
} from "@/lib/management-classes/data";
import type { Database, PracticeScriptCategory, PracticeScriptDifficulty } from "@/types/database.types";
import {
  buildRelayQuestState,
  getDisplayName,
  type RelayFeedback,
  type RelaySubmission,
  type StudyMember,
} from "./relay";

type StudyGroupRow = Database["public"]["Tables"]["study_groups"]["Row"];
type StudyGroupMemberRow = Database["public"]["Tables"]["study_group_members"]["Row"];
type StudyQuestRow = Database["public"]["Tables"]["study_quests"]["Row"];
type RelaySubmissionRow = Database["public"]["Tables"]["study_relay_submissions"]["Row"];
type RelayFeedbackRow = Database["public"]["Tables"]["study_relay_feedback"]["Row"];
type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

type StudyGroupSummaryRow = Pick<StudyGroupRow, "id" | "title" | "description" | "status">;
type StudyMemberSummaryRow = Pick<StudyGroupMemberRow, "group_id" | "student_email" | "display_order">;
type StudyQuestSummaryRow = Pick<
  StudyQuestRow,
  "id" | "group_id" | "script_title" | "due_at" | "status"
>;
type PracticeScriptSummaryRow = Pick<
  Database["public"]["Tables"]["practice_scripts"]["Row"],
  "id" | "title" | "category" | "type" | "difficulty" | "description"
>;

export type StudentDashboardDueState = "steady" | "due_soon" | "overdue";

export type StudentDashboardStudySummary = {
  id: string;
  title: string;
  description: string;
  memberCount: number;
  questCount: number;
  openQuestCount: number;
  nextDueAt: string | null;
};

export type StudentDashboardTask = {
  id: string;
  studyId: string;
  studyTitle: string;
  questId: string;
  questTitle: string;
  dueAt: string;
  type: "first_submission" | "feedback_and_upload";
  title: string;
  description: string;
  dueState: StudentDashboardDueState;
};

export type StudentDashboardFeedback = {
  id: string;
  studyId: string;
  studyTitle: string;
  questTitle: string;
  authorName: string;
  comment: string;
  createdAt: string;
};

export type StudentPracticeHighlight = {
  id: string;
  title: string;
  category: PracticeScriptCategory;
  type: string;
  difficulty: PracticeScriptDifficulty;
  description: string;
};

export type StudentDashboardData = {
  managementClassNotices: StudentManagementClassNotice[];
  studies: StudentDashboardStudySummary[];
  studyCount: number;
  openQuestCount: number;
  nextDueAt: string | null;
  nextStudyId: string | null;
  tasks: StudentDashboardTask[];
  taskCount: number;
  recentFeedback: StudentDashboardFeedback[];
  practiceHighlights: StudentPracticeHighlight[];
};

const EMPTY_DATA: StudentDashboardData = {
  managementClassNotices: [],
  studies: [],
  studyCount: 0,
  openQuestCount: 0,
  nextDueAt: null,
  nextStudyId: null,
  tasks: [],
  taskCount: 0,
  recentFeedback: [],
  practiceHighlights: [],
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function getStudentDashboardData(email: string | null): Promise<StudentDashboardData> {
  if (!email) return EMPTY_DATA;

  const supabase = createAdminClient();
  const practiceHighlightsPromise = supabase
    .from("practice_scripts")
    .select("id,title,category,type,difficulty,description")
    .order("created_at", { ascending: false })
    .limit(3)
    .returns<PracticeScriptSummaryRow[]>();
  const managementClassNoticesPromise = getStudentManagementClassDashboard(email);

  const { data: membershipRows } = await supabase
    .from("study_group_members")
    .select("group_id,student_email,display_order")
    .eq("student_email", email)
    .returns<StudyMemberSummaryRow[]>();

  const practiceHighlightsResult = await practiceHighlightsPromise;
  const [managementClassNotices, practiceHighlights] = [
    await managementClassNoticesPromise,
    practiceHighlightsResult.data ?? [],
  ];
  const groupIds = [...new Set((membershipRows ?? []).map((member) => member.group_id))];

  if (groupIds.length === 0) {
    return { ...EMPTY_DATA, managementClassNotices, practiceHighlights };
  }

  const [{ data: groupRows }, { data: memberRows }, { data: questRows }] = await Promise.all([
    supabase
      .from("study_groups")
      .select("id,title,description,status")
      .eq("type", "relay")
      .in("id", groupIds)
      .returns<StudyGroupSummaryRow[]>(),
    supabase
      .from("study_group_members")
      .select("group_id,student_email,display_order")
      .in("group_id", groupIds)
      .returns<StudyMemberSummaryRow[]>(),
    supabase
      .from("study_quests")
      .select("id,group_id,script_title,due_at,status")
      .in("group_id", groupIds)
      .order("due_at", { ascending: true })
      .returns<StudyQuestSummaryRow[]>(),
  ]);

  const groups = (groupRows ?? []).filter((group) => group.status === "active");
  const activeGroupIds = new Set(groups.map((group) => group.id));
  const quests = (questRows ?? []).filter((quest) => activeGroupIds.has(quest.group_id));
  const questIds = quests.map((quest) => quest.id);
  const { data: submissionRows } =
    questIds.length > 0
      ? await supabase
          .from("study_relay_submissions")
          .select("*")
          .in("quest_id", questIds)
          .order("sequence_number", { ascending: true })
          .returns<RelaySubmissionRow[]>()
      : { data: [] as RelaySubmissionRow[] };

  const submissions = submissionRows ?? [];
  const submissionIds = submissions.map((submission) => submission.id);
  const { data: feedbackRows } =
    submissionIds.length > 0
      ? await supabase
          .from("study_relay_feedback")
          .select("*")
          .in("submission_id", submissionIds)
          .order("created_at", { ascending: false })
          .returns<RelayFeedbackRow[]>()
      : { data: [] as RelayFeedbackRow[] };

  const feedback = feedbackRows ?? [];
  const profiles = await getProfilesByEmail([
    ...new Set([
      email,
      ...(memberRows ?? []).map((member) => member.student_email),
      ...submissions.map((submission) => submission.student_email),
      ...feedback.map((item) => item.feedback_author_email),
    ]),
  ]);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const questById = new Map(quests.map((quest) => [quest.id, quest]));
  const submissionsByQuestId = groupBy(submissions, (submission) => submission.quest_id);
  const submissionById = new Map(submissions.map((submission) => [submission.id, submission]));
  const feedbackBySubmissionId = new Map<string, RelayFeedback>();

  feedback.forEach((item) => {
    feedbackBySubmissionId.set(item.submission_id, {
      id: item.id,
      submissionId: item.submission_id,
      authorEmail: item.feedback_author_email,
      authorName: displayName(item.feedback_author_email, profiles),
      comment: item.comment,
      createdAt: item.created_at,
    });
  });

  const studyMembersByGroupId = new Map<string, StudyMember[]>();
  (memberRows ?? [])
    .filter((member) => activeGroupIds.has(member.group_id))
    .forEach((member) => {
      const members = studyMembersByGroupId.get(member.group_id) ?? [];
      members.push({
        email: member.student_email,
        displayName: displayName(member.student_email, profiles),
        displayOrder: member.display_order,
      });
      studyMembersByGroupId.set(member.group_id, members);
    });

  const openQuests = quests.filter((quest) => quest.status === "open");
  const studies = groups.map((group) => {
    const groupQuests = quests.filter((quest) => quest.group_id === group.id);
    const groupOpenQuests = groupQuests.filter((quest) => quest.status === "open");

    return {
      id: group.id,
      title: group.title,
      description: group.description,
      memberCount: studyMembersByGroupId.get(group.id)?.length ?? 0,
      questCount: groupQuests.length,
      openQuestCount: groupOpenQuests.length,
      nextDueAt: groupOpenQuests[0]?.due_at ?? null,
    };
  });

  const tasks = openQuests
    .flatMap((quest) => {
      const group = groupById.get(quest.group_id);
      if (!group) return [];

      const state = buildRelayQuestState({
        members: studyMembersByGroupId.get(quest.group_id) ?? [],
        submissions: (submissionsByQuestId.get(quest.id) ?? []).map((submission) =>
          toRelaySubmission(submission, profiles, feedbackBySubmissionId),
        ),
        currentUserEmail: email,
        questStatus: quest.status,
      });

      if (state.canStart) {
        return [
          buildTask({
            group,
            quest,
            type: "first_submission",
            title: "첫 음성 제출",
            description: "아직 릴레이가 시작되지 않았습니다. 첫 녹음으로 흐름을 열어 주세요.",
          }),
        ];
      }

      if (state.canFeedbackAndUpload) {
        return [
          buildTask({
            group,
            quest,
            type: "feedback_and_upload",
            title: "피드백 남기고 내 음성 제출",
            description: `${state.pendingSubmission?.studentName ?? "이전 제출자"}님의 음성에 피드백을 남긴 뒤 내 녹음을 제출합니다.`,
          }),
        ];
      }

      return [];
    })
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const recentFeedback = feedback
    .map((item) => {
      const submission = submissionById.get(item.submission_id);
      if (!submission) return null;

      const quest = questById.get(submission.quest_id);
      if (!quest) return null;

      const group = groupById.get(quest.group_id);
      if (!group) return null;

      if (submission.student_email !== email) return null;

      return {
        id: item.id,
        studyId: group.id,
        studyTitle: group.title,
        questTitle: quest.script_title,
        authorName: displayName(item.feedback_author_email, profiles),
        comment: item.comment,
        createdAt: item.created_at,
      } satisfies StudentDashboardFeedback;
    })
    .filter((item): item is StudentDashboardFeedback => item !== null)
    .slice(0, 3);

  return {
    managementClassNotices,
    studies,
    studyCount: studies.length,
    openQuestCount: openQuests.length,
    nextDueAt: openQuests[0]?.due_at ?? null,
    nextStudyId: openQuests[0]?.group_id ?? studies[0]?.id ?? null,
    tasks: tasks.slice(0, 4),
    taskCount: tasks.length,
    recentFeedback,
    practiceHighlights,
  };
}

function buildTask({
  group,
  quest,
  type,
  title,
  description,
}: {
  group: StudyGroupSummaryRow;
  quest: StudyQuestSummaryRow;
  type: StudentDashboardTask["type"];
  title: string;
  description: string;
}): StudentDashboardTask {
  return {
    id: `${quest.id}-${type}`,
    studyId: group.id,
    studyTitle: group.title,
    questId: quest.id,
    questTitle: quest.script_title,
    dueAt: quest.due_at,
    type,
    title,
    description,
    dueState: getDueState(quest.due_at),
  };
}

function toRelaySubmission(
  submission: RelaySubmissionRow,
  profiles: Map<string, Pick<UserProfileRow, "email" | "display_name" | "real_name">>,
  feedbackBySubmissionId: Map<string, RelayFeedback>,
): RelaySubmission {
  return {
    id: submission.id,
    questId: submission.quest_id,
    studentEmail: submission.student_email,
    studentName: displayName(submission.student_email, profiles),
    audioPath: submission.audio_path,
    audioUrl: null,
    audioFileName: submission.audio_file_name,
    audioContentType: submission.audio_content_type,
    audioSizeBytes: submission.audio_size_bytes,
    sequenceNumber: submission.sequence_number,
    submittedAt: submission.submitted_at,
    audioDeletedAt: submission.audio_deleted_at,
    feedback: feedbackBySubmissionId.get(submission.id) ?? null,
  };
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const grouped = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });
  return grouped;
}

async function getProfilesByEmail(emails: string[]) {
  const uniqueEmails = [...new Set(emails)].filter(Boolean);
  if (uniqueEmails.length === 0) return new Map<string, Pick<UserProfileRow, "email" | "display_name" | "real_name">>();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("email, display_name, real_name")
    .in("email", uniqueEmails);

  return new Map(
    ((data ?? []) as Pick<UserProfileRow, "email" | "display_name" | "real_name">[]).map((profile) => [
      profile.email,
      profile,
    ]),
  );
}

function displayName(
  email: string,
  profiles: Map<string, Pick<UserProfileRow, "email" | "display_name" | "real_name">>,
) {
  const profile = profiles.get(email);
  return getDisplayName({
    email,
    displayName: profile?.real_name ?? profile?.display_name,
  });
}

function getDueState(dueAt: string): StudentDashboardDueState {
  const dueTime = new Date(dueAt).getTime();
  if (!Number.isFinite(dueTime)) return "steady";

  const remaining = dueTime - Date.now();
  if (remaining < 0) return "overdue";
  if (remaining <= DAY_IN_MS) return "due_soon";
  return "steady";
}
