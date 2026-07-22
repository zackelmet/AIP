import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verifyAuth";
import { adminDb, adminStorage } from "@/lib/firebase/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const token = await verifyAdmin(request);
    if (!token) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pentestId = request.nextUrl.searchParams.get("pentestId");
    if (!pentestId) {
      return NextResponse.json({ error: "Missing pentestId" }, { status: 400 });
    }

    const pentestRef = adminDb.collection("pentests").doc(pentestId);
    const pentestDoc = await pentestRef.get();

    if (!pentestDoc.exists) {
      return NextResponse.json({ error: "Pentest not found" }, { status: 404 });
    }

    const storagePath = pentestDoc.data()?.reportStoragePath;
    if (!storagePath) {
      return NextResponse.json({ error: "No report stored" }, { status: 404 });
    }

    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        { error: "Report file not found" },
        { status: 404 },
      );
    }

    const [bytes] = await file.download();
    const fileName = pentestDoc.data()?.reportFileName || "report.pdf";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Report download error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
