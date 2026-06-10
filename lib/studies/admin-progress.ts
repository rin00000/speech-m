/**
 * 관리자 대시보드에서 표시할 릴레이 스터디 진행 현황을 계산한다.
 * 입력 액션 없이 운영자가 참여율과 병목 퀘스트만 빠르게 확인할 수 있게 요약한다.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type StudyGroupRow = Database["public"]["Tables"]["study_groups"]["Row"];
type StudyGroupMemberRow = Database["public"]["Tables"]["study_group_members"]["Row"];
type StudyQuestRow = Database["public"]["Tables"]["study_quests"]["Row"];
type RelaySubmissionRow = Database["public"]["Tables"]["study_relay_submissions"]["Row"];
type RelayFeedbackRow = Database["public"]["Tables"]["study_relay_feedback"]["Row"];

type StudyGroupSummaryRow = Pick<StudyGroupRow, "id" | "title" | "status">;
type StudyGroupMemberSummaryRow = Pick<StudyGroupMemberRow, "group_id" | "student_user_id">;
type StudyQuestSummaryRow = Pick<
  StudyQuestRow,
  "id" | "group_id" | "script_title" | "due_at" | "status"
>;
type RelaySubmissionSummaryRow = Pick<RelaySubmissionRow, "id" | "quest_id">;
type RelayFeedbackSummaryRow = Pick<RelayFeedbackRow, "submission_id">;

export type AdminStudyDueState = "steady" | "due_soon" | "overdue";

export type AdminStudyQuestProgressItem = {
  id: string;
  studyId: string;
  studyTitle: string;
  questTitle: string;
  dueAt: string;
  memberCount: number;
  submissionCount: number;
  feedbackCount: number;
  submissionRate: number;
  feedbackRate: number;
  dueState: AdminStudyDueState;
};

export type AdminStudyProgress = {
  activeStudyCount: number;
  activeMemberCount: number;
  openQuestCount: number;
  submissionRate: number;
  feedbackRate: number;
  attentionQuestCount: number;
  upcomingQuests: AdminStudyQuestProgressItem[];
};

export type AdminStudyProgressResult = {
  progress: AdminStudyProgress;
  hasError: boolean;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const EMPTY_PROGRESS: AdminStudyProgress = {
  activeStudyCount: 0,
  activeMemberCount: 0,
  openQuestCount: 0,
  submissionRate: 0,
  feedbackRate: 0,
  attentionQuestCount: 0,
  upcomingQuests: [],
};

export async function getAdminStudyProgress(): Promise<AdminStudyProgressResult> {
  const supabase = createAdminClient();

  const [groupsResult, membersResult, questsResult] = await Promise.all([
    supabase
      .from("study_groups")
      .select("id,title,status")
      .eq("type", "relay")
      .returns<StudyGroupSummaryRow[]>(),
    supabase
      .from("study_group_members")
      .select("group_id,student_user_id")
      .returns<StudyGroupMemberSummaryRow[]>(),
    supabase
      .from("study_quests")
      .select("id,group_id,script_title,due_at,status")
      .order("due_at", { ascending: true })
      .returns<StudyQuestSummaryRow[]>(),
  ]);

  if (groupsResult.error || membersResult.error || questsResult.error) {
    return { progress: EMPTY_PROGRESS, hasError: true };
  }

  const groups = groupsResult.data ?? [];
  const members = membersResult.data ?? [];
  const quests = questsResult.data ?? [];
  const activeGroups = groups.filter((group) => group.status === "active");
  const activeGroupIds = new Set(activeGroups.map((group) => group.id));
  const activeGroupTitleById = new Map(activeGroups.map((group) => [group.id, group.title]));
  const memberCountByGroupId = countBy(
    members.filter((member) => activeGroupIds.has(member.group_id)),
    (member) => member.group_id,
  );
  const openQuests = quests.filter(
    (quest) => quest.status === "open" && activeGroupIds.has(quest.group_id),
  );
  const openQuestIds = openQuests.map((quest) => quest.id);

  const submissionsResult =
    openQuestIds.length > 0
      ? await supabase
          .from("study_relay_submissions")
          .select("id,quest_id")
          .in("quest_id", openQuestIds)
          .returns<RelaySubmissionSummaryRow[]>()
      : { data: [] as RelaySubmissionSummaryRow[], error: null };

  const submissions = submissionsResult.data ?? [];
  const submissionIds = submissions.map((submission) => submission.id);
  const feedbackResult =
    submissionIds.length > 0
      ? await supabase
          .from("study_relay_feedback")
          .select("submission_id")
          .in("submission_id", submissionIds)
          .returns<RelayFeedbackSummaryRow[]>()
      : { data: [] as RelayFeedbackSummaryRow[], error: null };

  const feedback = feedbackResult.data ?? [];
  const submissionCountByQuestId = countBy(submissions, (submission) => submission.quest_id);
  const feedbackSubmissionIds = new Set(feedback.map((item) => item.submission_id));
  const feedbackCountByQuestId = new Map<string, number>();

  submissions.forEach((submission) => {
    if (!feedbackSubmissionIds.has(submission.id)) return;
    feedbackCountByQuestId.set(
      submission.quest_id,
      (feedbackCountByQuestId.get(submission.quest_id) ?? 0) + 1,
    );
  });

  const now = Date.now();
  const activeMemberUserIds = new Set(
    members
      .filter((member) => activeGroupIds.has(member.group_id))
      .map((member) => member.student_user_id),
  );
  const totalExpectedSubmissions = openQuests.reduce(
    (sum, quest) => sum + (memberCountByGroupId.get(quest.group_id) ?? 0),
    0,
  );
  const totalSubmissions = submissions.length;
  const totalFeedback = feedback.length;

  const upcomingQuests = openQuests.slice(0, 4).map((quest) => {
    const memberCount = memberCountByGroupId.get(quest.group_id) ?? 0;
    const submissionCount = submissionCountByQuestId.get(quest.id) ?? 0;
    const feedbackCount = feedbackCountByQuestId.get(quest.id) ?? 0;

    return {
      id: quest.id,
      studyId: quest.group_id,
      studyTitle: activeGroupTitleById.get(quest.group_id) ?? "스터디",
      questTitle: quest.script_title,
      dueAt: quest.due_at,
      memberCount,
      submissionCount,
      feedbackCount,
      submissionRate: percentage(submissionCount, memberCount),
      feedbackRate: percentage(feedbackCount, submissionCount),
      dueState: getDueState({
        dueAt: quest.due_at,
        memberCount,
        submissionCount,
        feedbackCount,
        now,
      }),
    };
  });
  const attentionQuestCount = openQuests.filter((quest) => {
    const memberCount = memberCountByGroupId.get(quest.group_id) ?? 0;
    const submissionCount = submissionCountByQuestId.get(quest.id) ?? 0;
    const feedbackCount = feedbackCountByQuestId.get(quest.id) ?? 0;
    return getDueState({
      dueAt: quest.due_at,
      memberCount,
      submissionCount,
      feedbackCount,
      now,
    }) !== "steady";
  }).length;

  return {
    progress: {
      activeStudyCount: activeGroups.length,
      activeMemberCount: activeMemberUserIds.size,
      openQuestCount: openQuests.length,
      submissionRate: percentage(totalSubmissions, totalExpectedSubmissions),
      feedbackRate: percentage(totalFeedback, totalSubmissions),
      attentionQuestCount,
      upcomingQuests,
    },
    hasError: Boolean(submissionsResult.error || feedbackResult.error),
  };
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function getDueState({
  dueAt,
  memberCount,
  submissionCount,
  feedbackCount,
  now,
}: {
  dueAt: string;
  memberCount: number;
  submissionCount: number;
  feedbackCount: number;
  now: number;
}): AdminStudyDueState {
  const isRelayComplete =
    memberCount > 0 &&
    submissionCount >= memberCount &&
    feedbackCount >= submissionCount;
  if (memberCount <= 0 || isRelayComplete) return "steady";

  const dueTime = new Date(dueAt).getTime();
  if (!Number.isFinite(dueTime)) return "steady";
  if (dueTime < now) return "overdue";
  if (dueTime - now <= DAY_IN_MS) return "due_soon";
  return "steady";
}
