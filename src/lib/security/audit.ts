import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

export async function audit(
  event: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const safeDetails = JSON.parse(JSON.stringify(details));
  console.info("[security-audit]", JSON.stringify({ event, ...safeDetails }));

  try {
    await adminDb.collection("securityAudit").add({
      event,
      ...safeDetails,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + RETENTION_MS),
    });
  } catch (error) {
    console.error("[security-audit] write failed:", error);
  }
}
