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
): Promise<CurrentUser | null> {
  const supabase = createAdminClient();
  const [{ data: userRow }, { data: profileRow }] = await Promise.all([
    supabase.from("users").select("role, status").eq("id", userId).maybeSingle(),
    supabase
      .from("user_profiles")
      .select("email, display_name, real_name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!userRow || userRow.status !== "active") return null;

  const user = userRow as UserRow;
  const profile = profileRow as ProfileRow | null;

  return {
    userId,
    email: profile?.email ?? fallback?.email ?? null,
    name: profile?.display_name ?? fallback?.name ?? null,
    realName: profile?.real_name ?? fallback?.realName ?? null,
    image: profile?.avatar_url ?? fallback?.image ?? null,
    role: user.role,
    status: user.status,
  };
}

async function ensureDevPersona(persona: DevPersona) {
  const supabase = createAdminClient();
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", persona.userId)
    .maybeSingle();

  if (!existingUser) {
    await supabase.from("users").insert({
      id: persona.userId,
      role: persona.role,
      status: persona.status,
    });
  }

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

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const mockRole = cookieStore.get("mock_role")?.value;
    if (mockRole && process.env.NODE_ENV !== "production") {
      const devPersona = getDevPersonaFromCookieValue(mockRole);
      if (devPersona === null) return null;
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
  if (!session?.user?.userId) return null;

  return getCurrentUserById(session.user.userId, {
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  });
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
