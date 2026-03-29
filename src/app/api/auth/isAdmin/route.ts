import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verifyAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/isAdmin
 * Returns { isAdmin: true } only when the caller carries a valid
 * __session cookie that resolves to an admin user.
 * No uid query parameter — the identity is taken from the verified token.
 */
export async function GET(req: NextRequest) {
  try {
    const token = await verifyAdmin(req);
    if (!token) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }
    return NextResponse.json({ isAdmin: true });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
