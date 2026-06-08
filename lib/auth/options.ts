import type { NextAuthOptions } from "next-auth";
import type { Profile } from "next-auth";
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
      }

      if (!token.userId) return token;

      const supabase = createAdminClient();
      const [{ data: userRow }, { data: profileRow }] = await Promise.all([
        supabase.from("users").select("role, status").eq("id", token.userId).maybeSingle(),
        supabase
          .from("user_profiles")
          .select("email, display_name, avatar_url")
          .eq("user_id", token.userId)
          .maybeSingle(),
      ]);

      token.role = userRow?.role ?? token.role ?? "guest";
      token.status = userRow?.status ?? token.status ?? "active";
      token.email = profileRow?.email ?? token.email;
      token.name = profileRow?.display_name ?? token.name;
      token.picture = profileRow?.avatar_url ?? token.picture;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId ?? "";
        session.user.role = token.role ?? "guest";
        session.user.status = token.status ?? "active";
        session.user.email = token.email ?? null;
        session.user.name = token.name ?? null;
        session.user.image = token.picture ?? null;
      }
      return session;
    },
  },
};
