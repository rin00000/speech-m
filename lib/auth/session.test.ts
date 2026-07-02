import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCookies,
  mockCreateAdminClient,
  mockGetServerSession,
} = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockGetServerSession: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("react", async (importActual) => {
  const actual = await importActual<typeof import("react")>();
  return {
    ...actual,
    cache:
      <Args extends unknown[], Result>(fn: (...args: Args) => Result) =>
      (...args: Args) => {
        if (!mockRequestCache.has(fn)) {
          mockRequestCache.set(fn, fn(...args));
        }
        return mockRequestCache.get(fn) as Result;
      },
  };
});

vi.mock("@/lib/auth/options", () => ({
  authOptions: {},
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const mockRequestCache = new Map<unknown, unknown>();

beforeEach(() => {
  vi.resetModules();
  mockRequestCache.clear();
  mockCookies.mockResolvedValue({
    get: vi.fn(() => undefined),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUserAuthCheck", () => {
  it("builds CurrentUser from a valid NextAuth session without a Supabase lookup", async () => {
    mockGetServerSession.mockResolvedValue({
      expires: new Date(Date.now() + 60_000).toISOString(),
      user: {
        userId: USER_ID,
        email: "student@speech-m.test",
        name: "Student",
        realName: "홍길동",
        image: "https://example.com/avatar.png",
        role: "student",
        status: "active",
      },
    });

    const { getCurrentUserAuthCheck } = await import("./session");

    await expect(getCurrentUserAuthCheck()).resolves.toEqual({
      status: "authenticated",
      user: {
        userId: USER_ID,
        email: "student@speech-m.test",
        name: "Student",
        realName: "홍길동",
        image: "https://example.com/avatar.png",
        role: "student",
        status: "active",
      },
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("dedupes repeated auth checks within the request cache", async () => {
    mockGetServerSession.mockResolvedValue({
      expires: new Date(Date.now() + 60_000).toISOString(),
      user: {
        userId: USER_ID,
        email: null,
        name: null,
        realName: null,
        image: null,
        role: "admin",
        status: "active",
      },
    });

    const { getCurrentUserAuthCheck } = await import("./session");
    const [first, second] = await Promise.all([
      getCurrentUserAuthCheck(),
      getCurrentUserAuthCheck(),
    ]);

    expect(first).toEqual(second);
    expect(mockGetServerSession).toHaveBeenCalledTimes(1);
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("returns inactive_user when the session status is not active", async () => {
    mockGetServerSession.mockResolvedValue({
      expires: new Date(Date.now() + 60_000).toISOString(),
      user: {
        userId: USER_ID,
        role: "student",
        status: "suspended",
      },
    });

    const { getCurrentUserAuthCheck } = await import("./session");

    await expect(getCurrentUserAuthCheck()).resolves.toEqual({
      status: "invalid",
      reason: "inactive_user",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });
});
