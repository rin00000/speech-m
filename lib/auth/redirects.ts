/**
 * 로그인 이후 사용자의 역할과 callbackUrl에 따라 이동할 내부 경로를 결정한다.
 * 루트, 로그인 페이지, OAuth 완료 라우트가 같은 정책을 공유하도록 분리했다.
 */

import type { UserRole } from "@/lib/auth/session";

type RedirectUser = {
  role: UserRole;
} | null;

const DEFAULT_AFTER_LOGIN_PATH = "/auth/after-login";
const BLOCKED_CALLBACK_PREFIXES = ["/login", "/api/auth"];

export function getRoleLandingPath(role: UserRole): "/jobs" | "/dashboard" {
  return role === "guest" ? "/jobs" : "/dashboard";
}

export function getSafeCallbackPath(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed, "https://speech-m.local");
  } catch {
    return null;
  }

  const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  if (path === DEFAULT_AFTER_LOGIN_PATH) return null;
  if (BLOCKED_CALLBACK_PREFIXES.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  return path;
}

export function getPostLoginRedirect(user: RedirectUser, callbackUrl?: string | null): string {
  if (!user) return "/login";
  return getSafeCallbackPath(callbackUrl) ?? getRoleLandingPath(user.role);
}
