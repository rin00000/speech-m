/**
 * 릴레이 스터디 목록/상세 로더의 마감 상태 계산을 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStudiesForViewer, getStudyDetail } from "./data";

const { mockCreateAdminClient } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

const USER_A = "user-a";
const USER_B = "user-b";
const GROUP_ID = "group-1";
const FUTURE_QUEST_ID = "quest-future";
const EXPIRED_QUEST_ID = "quest-expired";
const CLOSED_QUEST_ID = "quest-closed";
const FUTURE_DUE_AT = "2026-07-01T09:00:00.000Z";
const EXPIRED_DUE_AT = "2026-06-29T09:00:00.000Z";

type StudyRows = Record<string, unknown[]>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-30T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("getStudiesForViewer", () => {
  it("counts active and expired open quests separately and uses future nextDueAt", async () => {
    mockStudyRows();

    const studies = await getStudiesForViewer({ role: "student", userId: USER_A });

    expect(studies).toHaveLength(1);
    expect(studies[0]).toMatchObject({
      id: GROUP_ID,
      openQuestCount: 2,
      activeOpenQuestCount: 1,
      overdueOpenQuestCount: 1,
      nextDueAt: FUTURE_DUE_AT,
    });
  });
});

describe("getStudyDetail", () => {
  it("marks each quest with its overdue state", async () => {
    mockStudyRows();

    const detail = await getStudyDetail({
      studyId: GROUP_ID,
      viewer: { role: "student", userId: USER_A },
    });

    expect(detail).not.toBeNull();
    expect(detail?.quests.find((quest) => quest.id === FUTURE_QUEST_ID)).toMatchObject({
      isOverdue: false,
    });
    expect(detail?.quests.find((quest) => quest.id === EXPIRED_QUEST_ID)).toMatchObject({
      isOverdue: true,
    });
    expect(detail?.quests.find((quest) => quest.id === CLOSED_QUEST_ID)).toMatchObject({
      isOverdue: false,
    });
  });
});

function mockStudyRows(overrides: Partial<StudyRows> = {}) {
  mockCreateAdminClient.mockReturnValue(
    createSupabaseMock({
      study_groups: [
        {
          id: GROUP_ID,
          title: "릴레이 스터디",
          description: "방송 원고 릴레이",
          status: "active",
          created_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      study_group_members: [
        {
          id: "member-1",
          group_id: GROUP_ID,
          student_user_id: USER_A,
          display_order: 1,
          created_at: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "member-2",
          group_id: GROUP_ID,
          student_user_id: USER_B,
          display_order: 2,
          created_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      study_quests: [
        {
          id: EXPIRED_QUEST_ID,
          group_id: GROUP_ID,
          script_title: "지난 뉴스",
          script_content: "지난 원고",
          due_at: EXPIRED_DUE_AT,
          status: "open",
          created_at: "2026-06-01T00:00:00.000Z",
        },
        {
          id: FUTURE_QUEST_ID,
          group_id: GROUP_ID,
          script_title: "아침 뉴스",
          script_content: "미래 원고",
          due_at: FUTURE_DUE_AT,
          status: "open",
          created_at: "2026-06-02T00:00:00.000Z",
        },
        {
          id: CLOSED_QUEST_ID,
          group_id: GROUP_ID,
          script_title: "마감 완료 뉴스",
          script_content: "닫힌 원고",
          due_at: EXPIRED_DUE_AT,
          status: "closed",
          created_at: "2026-06-03T00:00:00.000Z",
        },
      ],
      study_relay_submissions: [],
      study_relay_feedback: [],
      user_profiles: [
        {
          user_id: USER_A,
          email: "a@speech-m.test",
          display_name: "A",
          real_name: "첫번째",
        },
        {
          user_id: USER_B,
          email: "b@speech-m.test",
          display_name: "B",
          real_name: "두번째",
        },
      ],
      ...overrides,
    }),
  );
}

function createSupabaseMock(rows: StudyRows) {
  return {
    from: vi.fn((table: string) => createQueryMock(table, rows)),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(),
      })),
    },
  };
}

function createQueryMock(table: string, rows: StudyRows) {
  const result = { data: rows[table] ?? [], error: null };
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({
    data: (rows[table] ?? [])[0] ?? null,
    error: null,
  });
  query.then.mockImplementation((resolve, reject) => Promise.resolve(result).then(resolve, reject));

  return query;
}
