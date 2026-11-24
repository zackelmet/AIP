import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verifyAuth";
import { checkReachability } from "@/lib/pentests/reachability";
import { parseTargets } from "@/lib/pentest/targets";
import { resolveAndValidateTargets } from "@/lib/pentest/targetDns";
import { rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const MAX_TARGETS = 100;

export async function POST(request: NextRequest) {
  try {
    const token = await verifyAuth(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // This endpoint is an authenticated network-probe oracle: cap how often a
    // single user can call it.
    const rl = rateLimit(`reachability:${token.uid}`, 30, 3_600_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Reachability limit reached. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }

    const body = await request.json().catch(() => ({}));
    const raw = Array.isArray(body.targets) ? body.targets.join("\n") : "";

    // Same SSRF pipeline as a real launch: parse literals first, then resolve
    // hostnames and reject private/reserved answers (DNS rebinding defense).
    const parsed = parseTargets(raw);
    if (parsed.targets.length === 0) {
      return NextResponse.json(
        { error: "No valid targets provided", details: parsed.errors },
        { status: 400 },
      );
    }
    if (parsed.targets.length > MAX_TARGETS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_TARGETS} targets per reachability check` },
        { status: 400 },
      );
    }

    const resolved = await resolveAndValidateTargets(parsed.targets);
    if (resolved.targets.length === 0) {
      return NextResponse.json(
        {
          error: "Targets are not scannable",
          details: [...parsed.errors, ...resolved.errors],
        },
        { status: 400 },
      );
    }

    const results = await checkReachability(resolved.targets);
    const unreachable = results.filter((r) => r.status === "unreachable");
    const reachable = results.filter((r) => r.status === "reachable");

    return NextResponse.json({
      results,
      unreachableCount: unreachable.length,
      reachableCount: reachable.length,
      total: resolved.targets.length,
      rejected: [...parsed.errors, ...resolved.errors],
    });
  } catch (error: any) {
    console.error("Reachability check error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
