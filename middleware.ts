import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_REQUIRED_PREFIXES = ["/dashboard", "/jobs", "/reviews", "/studies"];
const CRAWL_PROTECTED_PATHS = ["/api/crawl/", "/api/admin/benchmark-job-fit"];

function isAuthRequiredPath(pathname: string) {
  if (pathname.startsWith("/jobs/") && pathname.endsWith("/share")) {
    return false;
  }
  return AUTH_REQUIRED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isCrawlProtectedPath(pathname: string) {
  return CRAWL_PROTECTED_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (request.method === "POST" && isCrawlProtectedPath(pathname)) {
    const secret = process.env.CRAWL_API_SECRET;
    const provided = request.headers.get("x-crawl-secret");
    if (!secret || !provided || provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isAuthRequiredPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    const callbackUrl = `${pathname}${search}`;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/jobs") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jobs/:path*",
    "/reviews/:path*",
    "/studies/:path*",
    "/api/crawl/:path*",
    "/api/admin/benchmark-job-fit",
  ],
};
