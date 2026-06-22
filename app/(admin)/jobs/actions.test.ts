import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createManualJobPosting,
  markJobsPublished,
  runCrawl,
  updateJobStatus,
} from "./actions";
import type { ManualJobPostingInput } from "@/lib/jobs/manual-job-posting";

const { mockCreateAdminClient, mockGetAdminAuthCheck, mockHeaders, mockTriggerCrawl } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockGetAdminAuthCheck: vi.fn(),
  mockHeaders: vi.fn(),
  mockTriggerCrawl: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAdminAuthCheck: () => mockGetAdminAuthCheck(),
  getAuthCheckErrorMessage: (result: { status: string }) => {
    if (result.status === "check_failed") return "Authentication check failed.";
    if (result.status === "forbidden") return "Forbidden.";
    return "Unauthorized.";
  },
  getAuthCheckFailureCode: (result: { status: string }) => {
    if (result.status === "check_failed") return "check_failed";
    if (result.status === "forbidden") return "forbidden";
    return "unauthorized";
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

vi.mock("@/lib/crawl/trigger", () => ({
  triggerCrawl: (...args: unknown[]) => mockTriggerCrawl(...args),
}));

vi.mock("@/lib/crawl/blocked-source-urls", () => ({
  addBlockedSourceUrls: vi.fn(),
}));

vi.mock("@/lib/ai/job-fit", () => ({
  evaluateBenchmarkPassFail: vi.fn(),
  runJobFitBatch: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const manualJobInput: ManualJobPostingInput = {
  company: "Speech M",
  deadline: "",
  location: "",
  sourceUrl: "https://example.com/jobs/1",
  title: "Announcer",
};

describe("/jobs admin mutations", () => {
  it("rejects result-returning mutations before side effects when the actor is not admin", async () => {
    mockGetAdminAuthCheck.mockResolvedValue({
      status: "forbidden",
      user: {
        email: "student@example.com",
        image: null,
        name: "Student",
        realName: null,
        role: "student",
        status: "active",
        userId: "student-id",
      },
    });

    await expect(createManualJobPosting(manualJobInput)).resolves.toEqual({
      success: false,
      authStatus: "forbidden",
      error: "Forbidden.",
    });
    await expect(markJobsPublished(["job-id"])).resolves.toEqual({
      success: false,
      authStatus: "forbidden",
      error: "Forbidden.",
    });
    await expect(runCrawl("mediajob_announcer")).resolves.toEqual({
      success: false,
      authStatus: "forbidden",
      error: "Forbidden.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
    expect(mockTriggerCrawl).not.toHaveBeenCalled();
  });

  it("rejects throw-based mutations before DB writes when auth check fails", async () => {
    mockGetAdminAuthCheck.mockResolvedValue({
      status: "check_failed",
      reason: "users_lookup_failed",
    });

    await expect(updateJobStatus("job-id", "approved")).rejects.toThrow(
      "Authentication check failed."
    );
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("returns authStatus for result-returning mutations when auth check fails", async () => {
    mockGetAdminAuthCheck.mockResolvedValue({
      status: "check_failed",
      reason: "users_lookup_failed",
    });

    await expect(runCrawl("mediajob_reporter")).resolves.toEqual({
      success: false,
      authStatus: "check_failed",
      error: "Authentication check failed.",
    });
    expect(mockTriggerCrawl).not.toHaveBeenCalled();
  });
});
