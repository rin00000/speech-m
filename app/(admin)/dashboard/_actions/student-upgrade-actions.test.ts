/**
 * 수강생 등업 문의 Server Action의 관리자 권한, RPC 호출, stale 요청 처리를 검증합니다.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approveStudentUpgradeRequest,
  rejectStudentUpgradeRequest,
} from "./student-upgrade-actions";

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

const ADMIN_USER = {
  email: "admin@speech-m.local",
  image: null,
  name: "Admin",
  realName: "관리자",
  role: "admin",
  status: "active",
  userId: "22222222-2222-4222-8222-222222222222",
};

const GUEST_USER = {
  ...ADMIN_USER,
  email: "guest@speech-m.local",
  name: "Guest",
  realName: "게스트",
  role: "guest",
  userId: "11111111-1111-4111-8111-111111111111",
};

const REQUEST_ID = "33333333-3333-4333-8333-333333333333";

describe("student upgrade admin actions", () => {
  it("rejects non-admin actors before DB access", async () => {
    mockGetCurrentUser.mockResolvedValue(GUEST_USER);

    await expect(approveStudentUpgradeRequest(REQUEST_ID)).resolves.toEqual({
      success: false,
      error: "관리자만 등업 문의를 승인할 수 있습니다.",
    });
    await expect(rejectStudentUpgradeRequest(REQUEST_ID)).resolves.toEqual({
      success: false,
      error: "관리자만 등업 문의를 반려할 수 있습니다.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("rejects invalid request IDs before DB access", async () => {
    mockGetCurrentUser.mockResolvedValue(ADMIN_USER);

    await expect(approveStudentUpgradeRequest("bad-id")).resolves.toEqual({
      success: false,
      error: "요청 ID가 올바르지 않습니다.",
    });
    await expect(rejectStudentUpgradeRequest("bad-id")).resolves.toEqual({
      success: false,
      error: "요청 ID가 올바르지 않습니다.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("calls approve RPC and revalidates dashboard and users", async () => {
    mockGetCurrentUser.mockResolvedValue(ADMIN_USER);
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mockCreateAdminClient.mockReturnValue({ rpc });

    await expect(approveStudentUpgradeRequest(REQUEST_ID)).resolves.toEqual({ success: true });

    expect(rpc).toHaveBeenCalledWith("approve_student_upgrade_request", {
      p_request_id: REQUEST_ID,
      p_resolved_by_user_id: ADMIN_USER.userId,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/users");
  });

  it("returns already_resolved when approve RPC sees a non-pending request", async () => {
    mockGetCurrentUser.mockResolvedValue(ADMIN_USER);
    const rpc = vi.fn().mockResolvedValue({
      error: { message: "student_upgrade_request_not_pending" },
    });
    mockCreateAdminClient.mockReturnValue({ rpc });

    await expect(approveStudentUpgradeRequest(REQUEST_ID)).resolves.toEqual({
      success: false,
      error: "이미 처리되었거나 존재하지 않는 등업 문의입니다.",
      code: "already_resolved",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/users");
  });

  it("returns already_resolved when reject finds no pending request", async () => {
    mockGetCurrentUser.mockResolvedValue(ADMIN_USER);
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const statusEq = vi.fn(() => ({ select }));
    const idEq = vi.fn(() => ({ eq: statusEq }));
    const update = vi.fn(() => ({ eq: idEq }));
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({ update })),
    });

    await expect(rejectStudentUpgradeRequest(REQUEST_ID)).resolves.toEqual({
      success: false,
      error: "이미 처리되었거나 존재하지 않는 등업 문의입니다.",
      code: "already_resolved",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "rejected",
        resolved_by_user_id: ADMIN_USER.userId,
      })
    );
    expect(idEq).toHaveBeenCalledWith("id", REQUEST_ID);
    expect(statusEq).toHaveBeenCalledWith("status", "pending");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/users");
  });
});
