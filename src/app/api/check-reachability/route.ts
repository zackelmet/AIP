import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verifyAuth";
import { checkReachability } from "@/lib/pentests/reachability";

export async function POST(request: NextRequest) {
  try {
    const token = await verifyAuth(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const targets: string[] = Array.isArray(body.targets) ? body.targets : [];

    if (targets.length === 0) {
      return NextResponse.json({ error: "No targets provided" }, { status: 400 });
    }

    if (targets.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 targets per reachability check" },
        { status: 400 },
      );
    }

    const results = await checkReachability(targets);
    const unreachable = results.filter((r) => r.status === "unreachable");
    const reachable = results.filter((r) => r.status === "reachable");

    return NextResponse.json({
      results,
      unreachableCount: unreachable.length,
      reachableCount: reachable.length,
      total: targets.length,
    });
  } catch (error: any) {
    console.error("Reachability check error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}