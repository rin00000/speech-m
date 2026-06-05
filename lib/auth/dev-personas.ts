/**
 * 로컬 검증 전용 사용자 페르소나 정의.
 * 운영 세션 조회와 분리해 mock_role 쿠키가 참조하는 테스트 계정만 한곳에서 관리한다.
 */

import type { UserRole } from "./session";

export type DevPersonaId = "admin" | "student" | "student2" | "student3" | "guest";
export type DevPersonaCookieValue = DevPersonaId | "none" | "actual";

export type DevPersona = {
  id: DevPersonaId;
  label: string;
  email: string;
  name: string;
  role: UserRole;
};

export const DEV_PERSONAS = {
  admin: {
    id: "admin",
    label: "Admin",
    email: "mock-admin@speech-m.com",
    name: "Mock Admin",
    role: "admin",
  },
  student: {
    id: "student",
    label: "Student A",
    email: "mock-student@speech-m.com",
    name: "Mock Student A",
    role: "student",
  },
  student2: {
    id: "student2",
    label: "Student B",
    email: "relay.student2@speech-m.local",
    name: "Mock Student B",
    role: "student",
  },
  student3: {
    id: "student3",
    label: "Student C",
    email: "relay.student3@speech-m.local",
    name: "Mock Student C",
    role: "student",
  },
  guest: {
    id: "guest",
    label: "Guest",
    email: "relay.guest1@speech-m.local",
    name: "Mock Guest",
    role: "guest",
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
