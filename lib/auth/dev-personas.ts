/**
 * 로컬 검증 전용 사용자 페르소나 정의.
 * 운영 세션 조회와 분리해 mock_role 쿠키가 참조하는 테스트 계정만 한곳에서 관리한다.
 */

import type { UserRole, UserStatus } from "@/types/database.types";

export type DevPersonaId = "admin" | "student" | "student2" | "student3" | "guest";
export type DevPersonaCookieValue = DevPersonaId | "none" | "actual";

export type DevPersona = {
  id: DevPersonaId;
  label: string;
  userId: string;
  email: string;
  name: string;
  realName: string | null;
  role: UserRole;
  status: UserStatus;
};

export const DEV_PERSONAS = {
  admin: {
    id: "admin",
    label: "Admin",
    userId: "00000000-0000-4000-8000-000000000001",
    email: "mock-admin@speech-m.com",
    name: "Mock Admin",
    realName: null,
    role: "admin",
    status: "active",
  },
  student: {
    id: "student",
    label: "Student A",
    userId: "00000000-0000-4000-8000-000000000002",
    email: "mock-student@speech-m.com",
    name: "Mock Student A",
    realName: null,
    role: "student",
    status: "active",
  },
  student2: {
    id: "student2",
    label: "Student B",
    userId: "00000000-0000-4000-8000-000000000003",
    email: "relay.student2@speech-m.local",
    name: "Mock Student B",
    realName: null,
    role: "student",
    status: "active",
  },
  student3: {
    id: "student3",
    label: "Student C",
    userId: "00000000-0000-4000-8000-000000000004",
    email: "relay.student3@speech-m.local",
    name: "Mock Student C",
    realName: null,
    role: "student",
    status: "active",
  },
  guest: {
    id: "guest",
    label: "Guest",
    userId: "00000000-0000-4000-8000-000000000005",
    email: "relay.guest1@speech-m.local",
    name: "Mock Guest",
    realName: null,
    role: "guest",
    status: "active",
  },
} satisfies Record<DevPersonaId, DevPersona>;

export const DEV_PERSONA_OPTIONS = [
  DEV_PERSONAS.admin,
  DEV_PERSONAS.student,
  DEV_PERSONAS.student2,
  DEV_PERSONAS.student3,
  DEV_PERSONAS.guest,
] as const;

export const DEV_PERSONA_COOKIE_VALUES = new Set<DevPersonaCookieValue>([
  "admin",
  "student",
  "student2",
  "student3",
  "guest",
  "none",
  "actual",
]);

export function getDevPersonaFromCookieValue(value: string | undefined) {
  if (!value) return undefined;
  if (value === "none") return null;
  if (!DEV_PERSONA_COOKIE_VALUES.has(value as DevPersonaCookieValue)) return undefined;
  return DEV_PERSONAS[value as DevPersonaId] ?? undefined;
}
