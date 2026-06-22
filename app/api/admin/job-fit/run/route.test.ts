import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { mockGetAdminAuthCheck } = vi.hoisted(() => ({
  mockGetAdminAuthCheck: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAdminAuthCheck: () => mockGetAdminAuthCheck(),
  getAuthCheckErrorMessage: (result: { status: string }) => {
    if (result.status === "check_failed") return "Authentication check failed.";
    if (result.status === "forbidden") return "Forbidden.";
    return "Unauthorized.";
  },
  getAuthCheckHttpStatus: (result: { status: string }) => {
    if (result.status === "check_failed") return 503;
    if (result.status === "forbidden") return 403;
    if (result.status === "authenticated") return 200;
    return 401;
  },
}));

vi.mock("@/lib/ai/job-fit", () => ({
  runJobFitBatch: vi.fn(),
}));

vi.mock("@/lib/ai/job-fit/constants", () => ({
  ADMIN_JOB_FIT_BATCH_LIMIT: 30,
}));

vi.mock("@/lib/ai/job-fit/pipeline/admin-run-lock", () => ({
  acquireAdminJobFitRunLock: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/job-fit/run auth responses", () => {
  it("returns 401 for invalid or missing users", async () => {
    mockGetAdminAuthCheck.mockResolvedValue({ status: "invalid", reason: "missing_session" });

    const response = await POST();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized.",
    });
  });

  it("returns 503 when authentication cannot be checked", async () => {
    mockGetAdminAuthCheck.mockResolvedValue({ status: "check_failed", reason: "users_lookup_failed" });

    const response = await POST();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Authentication check failed.",
    });
  });
});
