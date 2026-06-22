/**
 * NextAuth 세션과 JWT 타입 보강을 정의합니다.
 * `@/types/database.types`의 UserRole/UserStatus를 사용해 인증 콜백과 세션 조회 계약을 맞춥니다.
 */

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
      userId?: string;
      role: UserRole;
      status: UserStatus;
      authInvalid?: boolean;
      authInvalidReason?: string;
      authCheckFailed?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    status?: UserStatus;
    authInvalid?: boolean;
    authInvalidReason?: string;
    authCheckFailed?: boolean;
  }
}
