import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserRole, UserStatus } from "@/types/database.types";
import { authOptions } from "./options";

const { mockCreateAdminClient } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

type QueryError = { message: string };
type QueryResult<T> = { data: T | null; error: QueryError | null };
type UserRow = { role: UserRole; status: UserStatus };
type ProfileRow = {
  email: string | null;
  display_name: string | null;
  real_name: string | null;
  avatar_url: string | null;
};
type JwtCallback = (params: { token: JWT; user?: User }) => Promise<JWT>;
type SessionCallback = (params: { session: Session; token: JWT }) => Promise<Session>;

const jwtCallback = authOptions.callbacks?.jwt as JwtCallback;
const sessionCallback = authOptions.callbacks?.session as SessionCallback;

function makeQuery<T>(result: QueryResult<T>) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  };
  return builder;
}

function setSupabaseResults({
  userResult,
  profileResult = { data: null, error: null },
}: {
  userResult: QueryResult<UserRow>;
  profileResult?: QueryResult<ProfileRow>;
}) {
  const usersQuery = makeQuery(userResult);
  const profilesQuery = makeQuery(profileResult);
  const client = {
    from: vi.fn((table: string) => (table === "users" ? usersQuery : profilesQuery)),
  };
  mockCreateAdminClient.mockReturnValue(client);
  return { client, usersQuery, profilesQuery };
}

function makeSession(): Session {
  return {
    expires: new Date(Date.now() + 60_000).toISOString(),
    user: {
      email: null,
      image: null,
      name: null,
      role: "guest",
      status: "suspended",
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  mockCreateAdminClient.mockReset();
});

describe("authOptions jwt callback", () => {
  it("invalidates stale tokens when the users row is gone", async () => {
    setSupabaseResults({ userResult: { data: null, error: null } });

    const token = await jwtCallback({
      token: { userId: "old-admin-id", role: "admin", status: "active" },
    });
    const session = await sessionCallback({ session: makeSession(), token });

    expect(token.userId).toBeUndefined();
    expect(token.role).toBe("guest");
    expect(token.status).toBe("suspended");
    expect(token.authInvalid).toBe(true);
    expect(token.authInvalidReason).toBe("missing_user");
    expect(token.authCheckFailed).toBeUndefined();
    expect(session.user.userId).toBeUndefined();
    expect(session.user.role).toBe("guest");
  });

  it("keeps userId and marks authCheckFailed when users lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    setSupabaseResults({ userResult: { data: null, error: { message: "db down" } } });

    const token = await jwtCallback({
      token: { userId: "active-id", role: "admin", status: "active" },
    });
    const session = await sessionCallback({ session: makeSession(), token });

    expect(token.userId).toBe("active-id");
    expect(token.authCheckFailed).toBe(true);
    expect(token.authInvalid).toBeUndefined();
    expect(session.user.userId).toBeUndefined();
    expect(session.user.authCheckFailed).toBe(true);
  });

  it("clears authCheckFailed after a later successful users lookup", async () => {
    setSupabaseResults({
      userResult: { data: { role: "student", status: "active" }, error: null },
    });

    const token = await jwtCallback({
      token: {
        userId: "recovered-id",
        role: "guest",
        status: "suspended",
        authCheckFailed: true,
      },
    });

    expect(token.userId).toBe("recovered-id");
    expect(token.role).toBe("student");
    expect(token.status).toBe("active");
    expect(token.authCheckFailed).toBeUndefined();
    expect(token.authInvalid).toBeUndefined();
  });

  it("refreshes role from DB even when the old JWT role is admin", async () => {
    setSupabaseResults({
      userResult: { data: { role: "guest", status: "active" }, error: null },
      profileResult: {
        data: {
          email: "guest@example.com",
          display_name: "Guest",
          real_name: "Real Guest",
          avatar_url: null,
        },
        error: null,
      },
    });

    const token = await jwtCallback({
      token: { userId: "role-changed-id", role: "admin", status: "active" },
    });
    const session = await sessionCallback({ session: makeSession(), token });

    expect(token.role).toBe("guest");
    expect(token.status).toBe("active");
    expect(session.user.userId).toBe("role-changed-id");
    expect(session.user.role).toBe("guest");
    expect(session.user.email).toBe("guest@example.com");
    expect(session.user.realName).toBe("Real Guest");
  });

  it("invalidates inactive users and clears the cached realName", async () => {
    setSupabaseResults({
      userResult: { data: { role: "student", status: "suspended" }, error: null },
    });

    const token = await jwtCallback({
      token: {
        userId: "inactive-id",
        role: "student",
        status: "active",
        realName: "Inactive Student",
      },
    });
    const session = await sessionCallback({ session: makeSession(), token });

    expect(token.userId).toBeUndefined();
    expect(token.realName).toBeUndefined();
    expect(token.authInvalidReason).toBe("inactive_user");
    expect(session.user.userId).toBeUndefined();
    expect(session.user.realName).toBeNull();
    expect(session.user.status).toBe("suspended");
  });

  it("keeps authentication when only user_profiles lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    setSupabaseResults({
      userResult: { data: { role: "student", status: "active" }, error: null },
      profileResult: { data: null, error: { message: "profiles down" } },
    });

    const token = await jwtCallback({
      token: {
        userId: "student-id",
        role: "admin",
        status: "active",
        email: "old@example.com",
        name: "Old Name",
      },
    });

    expect(token.userId).toBe("student-id");
    expect(token.role).toBe("student");
    expect(token.status).toBe("active");
    expect(token.email).toBe("old@example.com");
    expect(token.name).toBe("Old Name");
    expect(token.authCheckFailed).toBeUndefined();
    expect(token.authInvalid).toBeUndefined();
  });
});
