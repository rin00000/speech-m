/**
 * 수강생 대시보드의 릴레이 피드백 할 일과 스터디 상태 요약을 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStudentDashboardData } from "./student-dashboard";

const { mockCreateAdminClient, mockGetStudentManagementClassDashboard, mockGetStudentStudyApplication } =
  vi.hoisted(() => ({
    mockCreateAdminClient: vi.fn(),
    mockGetStudentManagementClassDashboard: vi.fn(),
    mockGetStudentStudyApplication: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("@/lib/management-classes/data", () => ({
  getStudentManagementClassDashboard: (userId: string) =>
    mockGetStudentManagementClassDashboard(userId),
}));

vi.mock("@/lib/studies/applications", () => ({
  getStudentStudyApplication: (userId: string) => mockGetStudentStudyApplication(userId),
}));

const USER_A = "user-a";
const USER_B = "user-b";
const USER_C = "user-c";
const GROUP_ID = "group-1";
const QUEST_ID = "quest-1";
const DUE_AT = "2026-07-01T09:00:00.000Z";

type DashboardRows = Record<string, unknown[]>;

const members = [
  { group_id: GROUP_ID, student_user_id: USER_A, display_order: 1 },
  { group_id: GROUP_ID, student_user_id: USER_B, display_order: 2 },
  { group_id: GROUP_ID, student_user_id: USER_C, display_order: 3 },
];

const profiles = [
  { user_id: USER_A, email: "a@speech-m.test", display_name: "A", real_name: "첫번째" },
  { user_id: USER_B, email: "b@speech-m.test", display_name: "B", real_name: "두번째" },
  { user_id: USER_C, email: "c@speech-m.test", display_name: "C", real_name: "세번째" },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-30T00:00:00.000Z"));
  mockGetStudentManagementClassDashboard.mockResolvedValue([]);
  mockGetStudentStudyApplication.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("getStudentDashboardData relay feedback tasks", () => {
  it("creates a final feedback task for the first uploader after everyone submits", async () => {
    mockDashboardRows({
      study_relay_submissions: [
        submission(1, USER_A),
        submission(2, USER_B),
        submission(3, USER_C),
      ],
      study_relay_feedback: [feedback("submission-1", USER_B), feedback("submission-2", USER_C)],
    });

    const data = await getStudentDashboardData(USER_A);

    expect(data.taskCount).toBe(1);
    expect(data.tasks[0]).toMatchObject({
      type: "final_feedback",
      title: "마지막 피드백 남기기",
    });
    expect(data.studies[0]).toMatchObject({
      feedbackStatus: "needs_feedback",
      feedbackLabel: "마지막 피드백 필요",
      feedbackTone: "action",
    });
  });

  it("creates a feedback and upload task for an unsubmitted middle participant", async () => {
    mockDashboardRows({
      study_relay_submissions: [submission(1, USER_A)],
      study_relay_feedback: [],
    });

    const data = await getStudentDashboardData(USER_B);

    expect(data.taskCount).toBe(1);
    expect(data.tasks[0]).toMatchObject({
      type: "feedback_and_upload",
      title: "피드백 남기고 내 음성 제출",
    });
    expect(data.studies[0]).toMatchObject({
      feedbackStatus: "needs_feedback",
      feedbackLabel: "피드백 필요",
      feedbackTone: "action",
    });
  });

  it("shows the first uploader that the final feedback is still pending before their turn", async () => {
    mockDashboardRows({
      study_relay_submissions: [submission(1, USER_A), submission(2, USER_B)],
      study_relay_feedback: [feedback("submission-1", USER_B)],
    });

    const data = await getStudentDashboardData(USER_A);

    expect(data.taskCount).toBe(0);
    expect(data.studies[0]).toMatchObject({
      feedbackStatus: "waiting_final_turn",
      feedbackLabel: "마지막 피드백 예정",
      feedbackTone: "waiting",
    });
  });

  it("marks feedback complete after a student leaves feedback and uploads", async () => {
    mockDashboardRows({
      study_relay_submissions: [submission(1, USER_A), submission(2, USER_B)],
      study_relay_feedback: [feedback("submission-1", USER_B)],
    });

    const data = await getStudentDashboardData(USER_B);

    expect(data.taskCount).toBe(0);
    expect(data.studies[0]).toMatchObject({
      feedbackStatus: "completed",
      feedbackLabel: "내 피드백 완료",
      feedbackTone: "complete",
    });
  });
});

function mockDashboardRows(overrides: Partial<DashboardRows>) {
  mockCreateAdminClient.mockReturnValue(
    createSupabaseMock({
      practice_scripts: [],
      study_group_members: members,
      study_groups: [
        {
          id: GROUP_ID,
          title: "릴레이 스터디",
          description: "방송 원고 릴레이",
          status: "active",
        },
      ],
      study_quests: [
        {
          id: QUEST_ID,
          group_id: GROUP_ID,
          script_title: "아침 뉴스",
          due_at: DUE_AT,
          status: "open",
        },
      ],
      study_relay_submissions: [],
      study_relay_feedback: [],
      user_profiles: profiles,
      ...overrides,
    }),
  );
}

function createSupabaseMock(rows: DashboardRows) {
  return {
    from: vi.fn((table: string) => createQueryMock(table, rows)),
  };
}

function createQueryMock(table: string, rows: DashboardRows) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    in: vi.fn(),
    returns: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.in.mockImplementation(() => {
    if (table === "user_profiles") {
      return Promise.resolve({ data: rows[table] ?? [] });
    }
    return query;
  });
  query.returns.mockResolvedValue({ data: rows[table] ?? [], error: null });

  return query;
}

function submission(sequenceNumber: number, studentUserId: string) {
  return {
    id: `submission-${sequenceNumber}`,
    quest_id: QUEST_ID,
    student_user_id: studentUserId,
    audio_path: `relay/${QUEST_ID}/${studentUserId}/audio-${sequenceNumber}.mp3`,
    audio_file_name: `audio-${sequenceNumber}.mp3`,
    audio_content_type: "audio/mpeg",
    audio_size_bytes: 1024,
    sequence_number: sequenceNumber,
    submitted_at: "2026-06-30T01:00:00.000Z",
    audio_deleted_at: null,
  };
}

function feedback(submissionId: string, authorUserId: string) {
  return {
    id: `feedback-${submissionId}-${authorUserId}`,
    submission_id: submissionId,
    feedback_author_user_id: authorUserId,
    comment: "좋아요",
    created_at: "2026-06-30T02:00:00.000Z",
  };
}
