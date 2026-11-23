import { NextRequest, NextResponse } from "next/server";

/**
 * Images are served directly (images.unoptimized). Block the Next image
 * optimizer endpoint, which has had critical RCE/SSRF/DoS advisories.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/_next/image") {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/_next/image"] };
