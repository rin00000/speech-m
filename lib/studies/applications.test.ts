/**
 * 릴레이 스터디 신청 조회 로더의 로컬 스키마 호환성을 검증합니다.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { getPendingStudyApplications, getStudentStudyApplication } from "./applications";

const { mockCreateAdminClient } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const USER_ID = "11111111-1111-4111-8111-111111111111";
const missingStudyApplicationsTableError = {
  code: "PGRST205",
  details: null,
  hint: "Perhaps you meant the table 'public.management_class_applications'",
  message: "Could not find the table 'public.study_applications' in the schema cache",
};

describe("getStudentStudyApplication", () => {
  it("returns null in local development when the study_applications table is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockStudentApplicationQueryError(missingStudyApplicationsTableError);

    await expect(getStudentStudyApplication(USER_ID)).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("study_applications table is unavailable"),
      missingStudyApplicationsTableError
    );
  });

  it("throws the missing table error in production", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    mockStudentApplicationQueryError(missingStudyApplicationsTableError);

    await expect(getStudentStudyApplication(USER_ID)).rejects.toBe(
      missingStudyApplicationsTableError
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("keeps throwing non-schema errors", async () => {
    const permissionError = { code: "42501", message: "permission denied" };
    mockStudentApplicationQueryError(permissionError);

    await expect(getStudentStudyApplication(USER_ID)).rejects.toBe(permissionError);
  });
});

describe("getPendingStudyApplications", () => {
  it("returns an empty list in local development when the study_applications table is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockPendingApplicationsQueryError(missingStudyApplicationsTableError);

    await expect(getPendingStudyApplications()).resolves.toEqual([]);
  });

  it("throws the missing table error in production", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    mockPendingApplicationsQueryError(missingStudyApplicationsTableError);

    await expect(getPendingStudyApplications()).rejects.toBe(missingStudyApplicationsTableError);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

function mockStudentApplicationQueryError(error: unknown) {
  mockCreateAdminClient.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error,
              }),
            })),
          })),
        })),
      })),
    })),
  });
}

function mockPendingApplicationsQueryError(error: unknown) {
  mockCreateAdminClient.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            returns: vi.fn().mockResolvedValue({
              data: null,
              error,
            }),
          })),
        })),
      })),
    })),
  });
}
