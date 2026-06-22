import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth/options";
import { createAdminClient } from "@/lib/supabase/server";
import { getDevPersonaFromCookieValue, type DevPersona } from "./dev-personas";
import type { UserRole, UserStatus } from "@/types/database.types";

export type { UserRole, UserStatus };

export type CurrentUser = {
  userId: string;
  email: string | null;
  name: string | null;
  realName: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
};

export type AuthCheckResult =
  | { status: "authenticated"; user: CurrentUser }
  | { status: "invalid"; reason: "missing_session" | "missing_user" | "inactive_user" | "dev_persona_signed_out" }
  | { status: "check_failed"; reason: "users_lookup_failed"; error?: unknown }
  | { status: "forbidden"; user: CurrentUser };

export type AuthFailureCode = "unauthorized" | "forbidden" | "check_failed";

type UserRow = {
  role: UserRole;
  status: UserStatus;
};

type ProfileRow = {
  email: string | null;
  display_name: string | null;
  real_name: string | null;
  avatar_url: string | null;
};

async function getCurrentUserById(
  userId: string,
  fallback?: Partial<Pick<CurrentUser, "email" | "name" | "realName" | "image">>
): Promise<AuthCheckResult> {
  const supabase = createAdminClient();
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    console.error("[auth] users lookup failed", userError);
    return { status: "check_failed", reason: "users_lookup_failed", error: userError };
  }
  if (!userRow) return { status: "invalid", reason: "missing_user" };
  if (userRow.status !== "active") return { status: "invalid", reason: "inactive_user" };

  const { data: profileRow, error: profileError } = await supabase
    .from("user_profiles")
    .select("email, display_name, real_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[auth] user_profiles lookup failed", profileError);
  }

  const user = userRow as UserRow;
  const profile = profileError ? null : (profileRow as ProfileRow | null);

  return {
    status: "authenticated",
    user: {
      userId,
      email: profile?.email ?? fallback?.email ?? null,
      name: profile?.display_name ?? fallback?.name ?? null,
      realName: profile?.real_name ?? fallback?.realName ?? null,
      image: profile?.avatar_url ?? fallback?.image ?? null,
      role: user.role,
      status: user.status,
    },
  };
}

async function ensureDevPersona(persona: DevPersona) {
  const supabase = createAdminClient();
  await supabase.from("users").upsert(
    {
      id: persona.userId,
      role: persona.role,
      status: persona.status,
    },
    { onConflict: "id" }
  );

  await supabase.from("user_profiles").upsert(
    {
      user_id: persona.userId,
      email: persona.email,
      display_name: persona.name,
      real_name: persona.realName,
    },
    { onConflict: "user_id" }
  );

  await supabase.from("user_auth_identities").upsert(
    {
      user_id: persona.userId,
      provider: "credentials",
      provider_account_id: `dev:${persona.id}`,
      provider_email: persona.email,
      email_verified: true,
    },
    { onConflict: "provider,provider_account_id" }
  );
}

export function getAuthCheckHttpStatus(result: AuthCheckResult): 200 | 401 | 403 | 503 {
  if (result.status === "authenticated") return 200;
  if (result.status === "check_failed") return 503;
  if (result.status === "forbidden") return 403;
  return 401;
}

export function getAuthCheckErrorMessage(result: Exclude<AuthCheckResult, { status: "authenticated" }>) {
  if (result.status === "check_failed") return "Authentication check failed.";
  if (result.status === "forbidden") return "Forbidden.";
  return "Unauthorized.";
}

export function getAuthCheckFailureCode(
  result: Exclude<AuthCheckResult, { status: "authenticated" }>
): AuthFailureCode {
  if (result.status === "check_failed") return "check_failed";
  if (result.status === "forbidden") return "forbidden";
  return "unauthorized";
}

export async function getCurrentUserAuthCheck(): Promise<AuthCheckResult> {
  try {
    const cookieStore = await cookies();
    const mockRole = cookieStore.get("mock_role")?.value;
    if (mockRole && process.env.NODE_ENV !== "production") {
      const devPersona = getDevPersonaFromCookieValue(mockRole);
      if (devPersona === null) return { status: "invalid", reason: "dev_persona_signed_out" };
      if (devPersona !== undefined) {
        await ensureDevPersona(devPersona);
        return getCurrentUserById(devPersona.userId, {
          email: devPersona.email,
          name: devPersona.name,
          realName: devPersona.realName,
        });
      }
    }
  } catch {
    // Avoid static build failures when cookies are unavailable.
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.authCheckFailed) {
    return { status: "check_failed", reason: "users_lookup_failed" };
  }
  if (!session?.user?.userId) return { status: "invalid", reason: "missing_session" };

  return getCurrentUserById(session.user.userId, {
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  });
}

export async function getCurrentUser() {
  const result = await getCurrentUserAuthCheck();
  return result.status === "authenticated" ? result.user : null;
}

export async function getAdminAuthCheck(): Promise<AuthCheckResult> {
  const result = await getCurrentUserAuthCheck();
  if (result.status !== "authenticated") return result;
  if (result.user.role !== "admin") return { status: "forbidden", user: result.user };
  return result;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
