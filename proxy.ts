import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/api/crawl/:path*", "/api/admin/benchmark-job-fit"],
};

export function proxy(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  const secret = process.env.CRAWL_API_SECRET;
  const provided = request.headers.get("x-crawl-secret");

  if (!secret || !provided || provided !== secret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}
