/**
 * 릴레이 스터디 신청 Server Action의 권한, 입력 검증, RPC 호출을 검증합니다.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approveStudyApplication,
  rejectStudyApplication,
  submitStudyApplication,
} from "./study-application-actions";

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

afterEach(() => {
  vi.clearAllMocks();
});

const STUDENT_USER = {
  email: "student@speech-m.local",
  image: null,
  name: "Student",
  realName: "학생",
  role: "student",
  status: "active",
  userId: "11111111-1111-4111-8111-111111111111",
};

const ADMIN_USER = {
  ...STUDENT_USER,
  email: "admin@speech-m.local",
  name: "Admin",
  realName: "관리자",
  role: "admin",
  userId: "22222222-2222-4222-8222-222222222222",
};

const APPLICATION_ID = "33333333-3333-4333-8333-333333333333";
const GROUP_ID = "44444444-4444-4444-8444-444444444444";

describe("submitStudyApplication", () => {
  it("rejects non-students before DB access", async () => {
    mockGetCurrentUser.mockResolvedValue({ ...STUDENT_USER, role: "guest" });

    await expect(submitStudyApplication("참여하고 싶습니다.")).resolves.toEqual({
      success: false,
      error: "정회원 수강생만 릴레이 스터디 신청을 보낼 수 있습니다.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("rejects messages over 500 characters before DB access", async () => {
    mockGetCurrentUser.mockResolvedValue(STUDENT_USER);

    await expect(submitStudyApplication("a".repeat(501))).resolves.toEqual({
      success: false,
      error: "신청 메모는 500자 이하로 입력하세요.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("updates an existing pending application instead of inserting a duplicate", async () => {
    mockGetCurrentUser.mockResolvedValue(STUDENT_USER);
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: APPLICATION_ID }, error: null });
    const secondEq = vi.fn(() => ({ maybeSingle }));
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const select = vi.fn(() => ({ eq: firstEq }));
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));
    const insert = vi.fn();
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select, update, insert })),
    });

    const result = await submitStudyApplication("새 메모");

    expect(result.success).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        group_id: null,
        message: "새 메모",
        resolved_at: null,
        resolved_by_user_id: null,
      })
    );
    expect(updateEq).toHaveBeenCalledWith("id", APPLICATION_ID);
    expect(insert).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/studies");
  });

  it("retries with update when insert hits a pending-application conflict", async () => {
    mockGetCurrentUser.mockResolvedValue(STUDENT_USER);
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const secondEq = vi.fn(() => ({ maybeSingle }));
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const select = vi.fn(() => ({ eq: firstEq }));
    const insert = vi.fn().mockResolvedValue({ error: { code: "23505" } });
    const retryStatusEq = vi.fn().mockResolvedValue({ error: null });
    const retryStudentEq = vi.fn(() => ({ eq: retryStatusEq }));
    const update = vi.fn(() => ({ eq: retryStudentEq }));
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select, insert, update })),
    });

    const result = await submitStudyApplication("동시 제출 메모");

    expect(result.success).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_user_id: STUDENT_USER.userId,
        message: "동시 제출 메모",
        status: "pending",
      })
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        group_id: null,
        message: "동시 제출 메모",
        resolved_at: null,
        resolved_by_user_id: null,
      })
    );
    expect(retryStudentEq).toHaveBeenCalledWith("student_user_id", STUDENT_USER.userId);
    expect(retryStatusEq).toHaveBeenCalledWith("status", "pending");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/studies");
  });
});

describe("study application admin actions", () => {
  it("rejects approve and reject before RPC when the actor is not admin", async () => {
    mockGetCurrentUser.mockResolvedValue(STUDENT_USER);

    await expect(approveStudyApplication(APPLICATION_ID, GROUP_ID)).resolves.toEqual({
      success: false,
      error: "관리자 권한이 필요합니다.",
    });
    await expect(rejectStudyApplication(APPLICATION_ID)).resolves.toEqual({
      success: false,
      error: "관리자 권한이 필요합니다.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("rejects invalid UUIDs before approving", async () => {
    mockGetCurrentUser.mockResolvedValue(ADMIN_USER);

    await expect(approveStudyApplication("bad-id", GROUP_ID)).resolves.toEqual({
      success: false,
      error: "신청 ID가 올바르지 않습니다.",
    });
    await expect(approveStudyApplication(APPLICATION_ID, "bad-group")).resolves.toEqual({
      success: false,
      error: "스터디 ID가 올바르지 않습니다.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("calls approve RPC with the selected group and revalidates study paths", async () => {
    mockGetCurrentUser.mockResolvedValue(ADMIN_USER);
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockCreateAdminClient.mockReturnValue({ rpc });

    await expect(approveStudyApplication(APPLICATION_ID, GROUP_ID)).resolves.toEqual({
      success: true,
      data: undefined,
    });

    expect(rpc).toHaveBeenCalledWith("approve_study_application", {
      p_application_id: APPLICATION_ID,
      p_group_id: GROUP_ID,
      p_resolved_by_user_id: ADMIN_USER.userId,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/studies");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/studies/${GROUP_ID}`);
  });

  it("calls reject RPC and revalidates study paths", async () => {
    mockGetCurrentUser.mockResolvedValue(ADMIN_USER);
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockCreateAdminClient.mockReturnValue({ rpc });

    await expect(rejectStudyApplication(APPLICATION_ID)).resolves.toEqual({
      success: true,
      data: undefined,
    });

    expect(rpc).toHaveBeenCalledWith("reject_study_application", {
      p_application_id: APPLICATION_ID,
      p_resolved_by_user_id: ADMIN_USER.userId,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/studies");
  });
});
