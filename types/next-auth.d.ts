import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role: "admin" | "student" | "guest";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "student" | "guest";
  }
}
