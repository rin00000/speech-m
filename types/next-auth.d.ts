import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@/types/database.types";

declare module "next-auth" {
  interface User {
    userId?: string;
    role?: UserRole;
    status?: UserStatus;
  }

  interface Session {
    user: DefaultSession["user"] & {
      userId: string;
      role: UserRole;
      status: UserStatus;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    status?: UserStatus;
  }
}
