import type { NextAuthOptions } from "next-auth";
import type { Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";
import { createAdminClient } from "@/lib/supabase/server";
import type { AuthProvider, UserRole, UserStatus } from "@/types/database.types";

type NaverProfile = {
  resultcode: string;
  message: string;
  response: {
    id: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
};

function NaverProvider<P extends NaverProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  return {
    id: "naver",
    name: "Naver",
    type: "oauth",
    authorization: "https://nid.naver.com/oauth2.0/authorize?scope=name,email",
    token: "https://nid.naver.com/oauth2.0/token",
    userinfo: "https://openapi.naver.com/v1/nid/me",
    profile(profile) {
      return {
        id: profile.response.id,
        name: profile.response.name ?? profile.response.nickname ?? "Naver User",
        email: profile.response.email ?? null,
        image: profile.response.profile_image ?? null,
      };
    },
    options,
  };
}

type IdentityResult = {
  user_id: string;
  user_role: UserRole;
  user_status: UserStatus;
  is_new: boolean;
};

type AuthInvalidReason = "missing_user" | "inactive_user";

type UserRow = {
  role: UserRole;
  status: UserStatus;
};

type ProfileRow = {
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function getEmailVerified(provider: string, profile?: Profile) {
  if (provider !== "google" || !profile || typeof profile !== "object") return false;
  const profileRecord = profile as Record<string, unknown>;
  return profileRecord.email_verified === true;
}

function isAuthProvider(provider: string): provider is AuthProvider {
  return provider === "google" || provider === "naver" || provider === "credentials";
}

async function findOrCreateIdentity(input: {
  provider: AuthProvider;
  providerAccountId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("find_or_create_user_by_identity", {
    p_provider: input.provider,
    p_provider_account_id: input.providerAccountId,
    p_email: input.email,
    p_name: input.name,
    p_avatar_url: input.avatarUrl,
    p_email_verified: input.emailVerified,
  });

  if (error) throw error;
  const result = data?.[0] as IdentityResult | undefined;
  if (!result) throw new Error("auth_identity_resolution_empty");
  return result;
}

function clearAuthFlags(token: JWT) {
  delete token.authInvalid;
  delete token.authInvalidReason;
  delete token.authCheckFailed;
}

function markTokenInvalid(token: JWT, reason: AuthInvalidReason) {
  delete token.userId;
  token.role = "guest";
  token.status = "suspended";
  token.authInvalid = true;
  token.authInvalidReason = reason;
  delete token.authCheckFailed;
  return token;
}

function markTokenCheckFailed(token: JWT) {
  token.role = "guest";
  token.status = "suspended";
  token.authCheckFailed = true;
  delete token.authInvalid;
  delete token.authInvalidReason;
  return token;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account?.provider || !account.providerAccountId) return false;
      if (!isAuthProvider(account.provider)) return false;

      const identity = await findOrCreateIdentity({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        email: user.email ?? null,
        name: user.name ?? null,
        avatarUrl: user.image ?? null,
        emailVerified: getEmailVerified(account.provider, profile),
      });

      user.userId = identity.user_id;
      user.role = identity.user_role;
      user.status = identity.user_status;

      return identity.user_status === "active";
    },
    async jwt({ token, user }) {
      if (user?.userId) {
        token.userId = user.userId;
        token.role = user.role ?? "guest";
        token.status = user.status ?? "active";
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        clearAuthFlags(token);
      }

      if (!token.userId) return token;

      const supabase = createAdminClient();
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("role, status")
        .eq("id", token.userId)
        .maybeSingle();

      if (userError) {
        console.error("[auth] jwt users lookup failed", userError);
        return markTokenCheckFailed(token);
      }
      if (!userRow) return markTokenInvalid(token, "missing_user");
      if (userRow.status !== "active") return markTokenInvalid(token, "inactive_user");

      const { data: profileRow, error: profileError } = await supabase
        .from("user_profiles")
        .select("email, display_name, avatar_url")
        .eq("user_id", token.userId)
        .maybeSingle();

      if (profileError) {
        console.error("[auth] jwt user_profiles lookup failed", profileError);
      }

      const userRecord = userRow as UserRow;
      const profile = profileError ? null : (profileRow as ProfileRow | null);

      clearAuthFlags(token);
      token.role = userRecord.role;
      token.status = userRecord.status;
      token.email = profile?.email ?? token.email;
      token.name = profile?.display_name ?? token.name;
      token.picture = profile?.avatar_url ?? token.picture;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const isAuthenticated =
          Boolean(token.userId) &&
          token.status === "active" &&
          token.authInvalid !== true &&
          token.authCheckFailed !== true;

        if (isAuthenticated && token.userId) {
          session.user.userId = token.userId;
        } else {
          delete session.user.userId;
        }
        session.user.role = isAuthenticated ? token.role ?? "guest" : "guest";
        session.user.status = isAuthenticated ? token.status ?? "active" : "suspended";
        session.user.authInvalid = token.authInvalid === true;
        session.user.authCheckFailed = token.authCheckFailed === true;
        if (token.authInvalidReason) {
          session.user.authInvalidReason = token.authInvalidReason;
        } else {
          delete session.user.authInvalidReason;
        }
        session.user.email = token.email ?? null;
        session.user.name = token.name ?? null;
        session.user.image = token.picture ?? null;
      }
      return session;
    },
  },
};
