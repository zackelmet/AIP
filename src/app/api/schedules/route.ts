import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/auth/verifyAuth";

const INTERVAL_PRESETS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
};

export async function POST(request: NextRequest) {
  try {
    const token = await verifyAuth(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = token.uid;

    const body = await request.json();
    const {
      type,
      targetUrl,
      userRoles,
      roles,
      endpoints,
      additionalContext,
      intervalPreset,
      customIntervalDays,
    } = body;

    if (!type || !targetUrl) {
      return NextResponse.json(
        { error: "Missing required fields: type and targetUrl" },
        { status: 400 },
      );
    }

    if (
      type !== "web_app" &&
      type !== "external_ip" &&
      type !== "pentest_plus"
    ) {
      return NextResponse.json(
        {
          error: "Invalid type. Must be web_app, external_ip, or pentest_plus",
        },
        { status: 400 },
      );
    }

    const normalizedTargetUrl =
      type === "external_ip"
        ? String(targetUrl)
            .split(",")
            .map((target: string) => target.trim())
            .filter(Boolean)
            .join(", ")
        : String(targetUrl).trim();

    if (!normalizedTargetUrl) {
      return NextResponse.json(
        { error: "Target is required" },
        { status: 400 },
      );
    }

    // Resolve interval
    let intervalDays: number;
    let intervalLabel: string;

    if (intervalPreset && INTERVAL_PRESETS[intervalPreset]) {
      intervalDays = INTERVAL_PRESETS[intervalPreset];
      intervalLabel = intervalPreset;
    } else if (customIntervalDays && Number(customIntervalDays) >= 1) {
      intervalDays = Math.round(Number(customIntervalDays));
      intervalLabel = `every ${intervalDays} day${intervalDays !== 1 ? "s" : ""}`;
    } else {
      return NextResponse.json(
        {
          error:
            "Provide intervalPreset (weekly|biweekly|monthly|quarterly) or customIntervalDays",
        },
        { status: 400 },
      );
    }

    // Calculate next run date
    const now = new Date();
    const nextRunAt = new Date(
      now.getTime() + intervalDays * 24 * 60 * 60 * 1000,
    );

    const scheduleRef = adminDb.collection("schedules").doc();
    const scheduleData = {
      id: scheduleRef.id,
      userId,
      type,
      targetUrl: normalizedTargetUrl,
      userRoles: userRoles || roles || null,
      endpoints: endpoints || null,
      additionalContext: additionalContext || null,
      intervalDays,
      intervalLabel,
      nextRunAt: nextRunAt,
      lastRunAt: null,
      status: "active",
      totalRuns: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await scheduleRef.set(scheduleData);

    return NextResponse.json({
      scheduleId: scheduleRef.id,
      message: "Schedule created successfully",
      nextRunAt: nextRunAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await verifyAuth(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = token.uid;

    const schedulesSnapshot = await adminDb
      .collection("schedules")
      .where("userId", "==", userId)
      .get();

    const schedules = schedulesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    schedules.sort((left: any, right: any) => {
      const leftMs = left.createdAt?.toMillis?.() || 0;
      const rightMs = right.createdAt?.toMillis?.() || 0;
      return rightMs - leftMs;
    });

    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
