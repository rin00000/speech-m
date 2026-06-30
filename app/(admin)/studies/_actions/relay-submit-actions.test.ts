/**
 * 릴레이 제출 Server Action의 마감 차단과 업로드 정리 흐름을 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStudyAudioUploadTarget,
  submitRelayFeedbackAndSubmission,
  submitRelayFinalFeedback,
  submitRelayFirstSubmission,
} from "./relay-submit-actions";
import { RELAY_QUEST_OVERDUE_ERROR_MESSAGE } from "./relay-action-helpers";

const { mockCreateAdminClient, mockGetCurrentUser, mockRevalidatePath } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const QUEST_ID = "22222222-2222-4222-8222-222222222222";
const GROUP_ID = "33333333-3333-4333-8333-333333333333";
const SUBMISSION_ID = "44444444-4444-4444-8444-444444444444";
const EXPIRED_DUE_AT = "2026-06-29T09:00:00.000Z";
const AUDIO_PATH = `relay/${QUEST_ID}/${USER_ID}/audio.mp3`;

const STUDENT_USER = {
  email: "student@speech-m.local",
  image: null,
  name: "Student",
  realName: "학생",
  role: "student",
  status: "active",
  userId: USER_ID,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-30T00:00:00.000Z"));
  mockGetCurrentUser.mockResolvedValue(STUDENT_USER);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("relay submit deadline guard", () => {
  it("rejects upload target creation after the quest deadline", async () => {
    const client = mockExpiredQuestClient();

    await expect(
      createStudyAudioUploadTarget({
        questId: QUEST_ID,
        fileName: "audio.mp3",
        sizeBytes: 1024,
        contentType: "audio/mpeg",
      }),
    ).resolves.toEqual({
      success: false,
      error: RELAY_QUEST_OVERDUE_ERROR_MESSAGE,
    });

    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("rejects first submission before RPC and removes uploaded audio", async () => {
    const client = mockExpiredQuestClient();

    await expect(
      submitRelayFirstSubmission({
        questId: QUEST_ID,
        fileName: "audio.mp3",
        sizeBytes: 1024,
        contentType: "audio/mpeg",
        audioPath: AUDIO_PATH,
      }),
    ).resolves.toEqual({
      success: false,
      error: RELAY_QUEST_OVERDUE_ERROR_MESSAGE,
    });

    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.remove).toHaveBeenCalledWith([AUDIO_PATH]);
  });

  it("rejects feedback and upload before RPC and removes uploaded audio", async () => {
    const client = mockExpiredQuestClient();

    await expect(
      submitRelayFeedbackAndSubmission({
        questId: QUEST_ID,
        targetSubmissionId: SUBMISSION_ID,
        comment: "좋아요",
        fileName: "audio.mp3",
        sizeBytes: 1024,
        contentType: "audio/mpeg",
        audioPath: AUDIO_PATH,
      }),
    ).resolves.toEqual({
      success: false,
      error: RELAY_QUEST_OVERDUE_ERROR_MESSAGE,
    });

    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.remove).toHaveBeenCalledWith([AUDIO_PATH]);
  });

  it("rejects final feedback before RPC after the quest deadline", async () => {
    const client = mockExpiredQuestClient();

    await expect(
      submitRelayFinalFeedback({
        questId: QUEST_ID,
        targetSubmissionId: SUBMISSION_ID,
        comment: "마지막 피드백",
      }),
    ).resolves.toEqual({
      success: false,
      error: RELAY_QUEST_OVERDUE_ERROR_MESSAGE,
    });

    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.remove).not.toHaveBeenCalled();
  });
});

function mockExpiredQuestClient() {
  const remove = vi.fn().mockResolvedValue({ data: null, error: null });
  const createSignedUploadUrl = vi.fn();
  const rpc = vi.fn();
  const client = {
    from: vi.fn(() => createQuestQueryMock()),
    rpc,
    storage: {
      from: vi.fn(() => ({
        createSignedUploadUrl,
        remove,
      })),
    },
  };

  mockCreateAdminClient.mockReturnValue(client);
  return { ...client, createSignedUploadUrl, remove };
}

function createQuestQueryMock() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({
    data: {
      group_id: GROUP_ID,
      status: "open",
      due_at: EXPIRED_DUE_AT,
    },
    error: null,
  });

  return query;
}
