import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";
import { createAdminClient } from "@/lib/supabase/server";

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

async function upsertUserProfile(email: string, name?: string | null) {
  const supabase = createAdminClient();
  await supabase.from("user_profiles").upsert(
    {
      email,
      display_name: name ?? null,
    },
    { onConflict: "email" }
  );
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
    async signIn({ user }) {
      if (!user.email) return false;
      await upsertUserProfile(user.email, user.name);
      return true;
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (!email) return token;

      const supabase = createAdminClient();
      const { data } = await supabase
        .from("user_profiles")
        .select("role, display_name")
        .eq("email", email)
        .maybeSingle();

      token.role = data?.role ?? "student";
      token.name = data?.display_name ?? user?.name ?? token.name;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as "admin" | "student" | undefined) ?? "student";
      }
      return session;
    },
  },
};
