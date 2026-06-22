/**
 * 보호 라우트의 1차 인증 게이트를 담당하는 Next.js Proxy 모듈입니다.
 * 경로 요구사항을 분류하고, NextAuth JWT의 userId로 DB 상태를 재검증하며,
 * 무효 세션의 NextAuth 쿠키 정리까지 처리합니다.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getDevPersonaFromCookieValue } from "@/lib/auth/dev-personas";
import { getNextAuthSessionCookieNamesToClear } from "@/lib/auth/session-cookies";
import type { UserRole, UserStatus } from "@/types/database.types";

const USER_PROTECTED_PREFIXES = ["/dashboard", "/settings", "/practice", "/reviews", "/studies"];
const ADMIN_PROTECTED_PREFIXES = ["/users", "/management-classes", "/api/admin/job-fit/run"];
const CRAWL_PROTECTED_PATHS = ["/api/crawl/", "/api/admin/benchmark-job-fit"];
const SUPABASE_PROXY_AUTH_TIMEOUT_MS = 3000;

type AuthRequirement = "none" | "user" | "admin";

type ProxyUserRow = {
  role: UserRole;
  status: UserStatus;
};

type ProxyAuthResult =
  | { status: "authenticated"; role: UserRole }
  | { status: "invalid"; clearSession: boolean }
  | { status: "check_failed" };

function pathMatchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getAuthRequirement(pathname: string): AuthRequirement {
  if (ADMIN_PROTECTED_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix))) {
    return "admin";
  }
  if (USER_PROTECTED_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix))) {
    return "user";
  }
  return "none";
}

function isCrawlProtectedPath(pathname: string) {
  return CRAWL_PROTECTED_PATHS.some((prefix) => pathname.startsWith(prefix));
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function getDevProxyAuth(
  request: NextRequest
): Exclude<ProxyAuthResult, { status: "check_failed" }> | null {
  if (process.env.NODE_ENV === "production") return null;

  const devPersona = getDevPersonaFromCookieValue(request.cookies.get("mock_role")?.value);
  if (devPersona === undefined) return null;
  if (devPersona === null || devPersona.status !== "active") {
    return { status: "invalid", clearSession: false };
  }

  return { status: "authenticated", role: devPersona.role };
}

async function getCurrentProxyUser(userId: string): Promise<ProxyAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[auth] proxy Supabase env missing");
    return { status: "check_failed" };
  }

  const url = new URL("/rest/v1/users", supabaseUrl);
  url.searchParams.set("select", "role,status");
  url.searchParams.set("id", `eq.${userId}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_PROXY_AUTH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[auth] proxy users lookup failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return { status: "check_failed" };
    }

    const rows = (await response.json()) as ProxyUserRow[];
    const user = rows[0];
    if (!user || user.status !== "active") {
      return { status: "invalid", clearSession: true };
    }

    return { status: "authenticated", role: user.role };
  } catch (error) {
    console.error("[auth] proxy users lookup failed", error);
    return { status: "check_failed" };
  } finally {
    clearTimeout(timeoutId);
  }
}

function clearNextAuthSessionCookies(response: NextResponse, request: NextRequest) {
  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);
  for (const name of getNextAuthSessionCookieNamesToClear(cookieNames)) {
    response.cookies.set(name, "", {
      expires: new Date(0),
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: name.startsWith("__Secure-"),
    });
  }
}

function unauthorizedResponse(request: NextRequest, clearSession: boolean) {
  if (isApiPath(request.nextUrl.pathname)) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (clearSession) clearNextAuthSessionCookies(response, request);
    return response;
  }

  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", callbackUrl);
  const response = NextResponse.redirect(loginUrl);
  if (clearSession) clearNextAuthSessionCookies(response, request);
  return response;
}

function authCheckFailedResponse(request: NextRequest) {
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.json({ error: "Authentication check failed" }, { status: 503 });
  }
  return new NextResponse("Authentication check failed", { status: 503 });
}

function forbiddenResponse(request: NextRequest) {
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.redirect(new URL("/dashboard", request.url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.method === "POST" && isCrawlProtectedPath(pathname)) {
    const secret = process.env.CRAWL_API_SECRET;
    const provided = request.headers.get("x-crawl-secret");
    if (!secret || !provided || provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const requirement = getAuthRequirement(pathname);
  if (requirement === "none") {
    return NextResponse.next();
  }

  const devAuth = getDevProxyAuth(request);
  if (devAuth) {
    if (devAuth.status === "invalid") {
      return unauthorizedResponse(request, devAuth.clearSession);
    }
    if (requirement === "admin" && devAuth.role !== "admin") {
      return forbiddenResponse(request);
    }
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId || token.authInvalid === true) {
    return unauthorizedResponse(request, token?.authInvalid === true);
  }

  const auth = await getCurrentProxyUser(token.userId);
  if (auth.status === "check_failed") {
    return authCheckFailedResponse(request);
  }
  if (auth.status === "invalid") {
    return unauthorizedResponse(request, auth.clearSession);
  }
  if (requirement === "admin" && auth.role !== "admin") {
    return forbiddenResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/practice/:path*",
    "/reviews/:path*",
    "/studies/:path*",
    "/users/:path*",
    "/management-classes/:path*",
    "/api/admin/job-fit/run",
    "/api/crawl/:path*",
    "/api/admin/benchmark-job-fit",
  ],
};
