import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const rl = rateLimit(`csp-report:${ip}`, 30, 60_000);
  if (!rl.ok) return new NextResponse(null, { status: 204 });

  const contentType = request.headers.get("content-type") || "";
  if (
    !contentType.includes("application/csp-report") &&
    !contentType.includes("application/reports+json")
  ) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await request.text();
  if (body.length > 16_384) return new NextResponse(null, { status: 204 });

  console.warn("[csp-report]", body);
  return new NextResponse(null, { status: 204 });
}
