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
const FUTURE_DUE_AT = "2026-07-01T09:00:00.000Z";
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
    const client = mockQuestClient({ dueAt: EXPIRED_DUE_AT });

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
    const client = mockQuestClient({ dueAt: EXPIRED_DUE_AT });

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
    const client = mockQuestClient({ dueAt: EXPIRED_DUE_AT });

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
    const client = mockQuestClient({ dueAt: EXPIRED_DUE_AT });

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

  it("maps an RPC deadline race error and removes uploaded audio", async () => {
    const client = mockQuestClient({
      rpcResult: { data: null, error: { message: "relay_quest_overdue" } },
    });

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

    expect(client.rpc).toHaveBeenCalledWith("submit_relay_first_submission", {
      p_quest_id: QUEST_ID,
      p_student_user_id: USER_ID,
      p_audio_path: AUDIO_PATH,
      p_audio_file_name: "audio.mp3",
      p_audio_content_type: "audio/mpeg",
      p_audio_size_bytes: 1024,
    });
    expect(client.remove).toHaveBeenCalledWith([AUDIO_PATH]);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates dashboard, studies, and study detail after a successful submission", async () => {
    const client = mockQuestClient();

    await expect(
      submitRelayFirstSubmission({
        questId: QUEST_ID,
        fileName: "audio.mp3",
        sizeBytes: 1024,
        contentType: "audio/mpeg",
        audioPath: AUDIO_PATH,
      }),
    ).resolves.toEqual({ success: true, data: undefined });

    expect(client.remove).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenNthCalledWith(1, "/dashboard");
    expect(mockRevalidatePath).toHaveBeenNthCalledWith(2, "/studies");
    expect(mockRevalidatePath).toHaveBeenNthCalledWith(3, `/studies/${GROUP_ID}`);
  });
});

function mockQuestClient({
  dueAt = FUTURE_DUE_AT,
  status = "open",
  rpcResult = { data: SUBMISSION_ID, error: null },
}: {
  dueAt?: string;
  status?: "open" | "closed";
  rpcResult?: { data: unknown; error: { message?: string } | null };
} = {}) {
  const remove = vi.fn().mockResolvedValue({ data: null, error: null });
  const createSignedUploadUrl = vi.fn();
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const client = {
    from: vi.fn(() => createQuestQueryMock({ dueAt, status })),
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

function createQuestQueryMock({ dueAt, status }: { dueAt: string; status: "open" | "closed" }) {
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
      status,
      due_at: dueAt,
    },
    error: null,
  });

  return query;
}
