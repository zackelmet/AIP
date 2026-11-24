import { NextResponse, NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const secret = requestHeaders.get("x-vercel-reval-key") || "";
  const expected = process.env.CONTENTFUL_REVALIDATE_SECRET || "";

  if (!expected || !safeEqual(secret, expected)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  revalidateTag("blog");

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
