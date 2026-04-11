/**
 * Server-side auth helper.
 * Reads the __session cookie (Firebase session cookie) and verifies it with
 * Firebase Admin, returning the decoded token (which includes uid, email,
 * and any custom claims). Falls back to verifying ID tokens for compatibility.
 *
 * Usage in an API route:
 *   const token = await verifyAuth(request);
 *   if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   const uid = token.uid;
 */

import { NextRequest } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";

type VerifyAuthOptions = {
  allowUnverified?: boolean;
};

export async function verifyAuth(
  request: NextRequest,
  options: VerifyAuthOptions = {},
) {
  // Primary: httpOnly session cookie (set post-login by AuthContext)
  const sessionCookie = request.cookies.get("__session")?.value;

  // Fallback: Authorization: Bearer <token> — used during signup before the
  // session cookie has been written (race condition on first auth state change)
  let idToken: string | undefined;
  if (!sessionCookie) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      idToken = authHeader.slice(7);
    }
  }

  if (!sessionCookie && !idToken) return null;

  try {
    const admin = initializeAdmin();
    let decoded: any = null;

    if (sessionCookie) {
      try {
        decoded = await admin.auth().verifySessionCookie(sessionCookie, false);
      } catch {
        // Backward compatibility: older cookies may still contain raw ID tokens.
        decoded = await admin.auth().verifyIdToken(sessionCookie);
      }
    } else if (idToken) {
      decoded = await admin.auth().verifyIdToken(idToken);
    }

    if (!decoded) return null;

    const signInProvider = (decoded as any)?.firebase?.sign_in_provider;
    const isPasswordUser = signInProvider === "password";
    const isEmailVerified = decoded.email_verified === true;

    if (!options.allowUnverified && isPasswordUser && !isEmailVerified) {
      return null;
    }

    return decoded; // { uid, email, isAdmin (custom claim), ... }
  } catch {
    return null;
  }
}

/**
 * Returns true if the verified token belongs to an admin.
 * Checks both the custom claim (fast) and the Firestore isAdmin field (fallback).
 */
export async function verifyAdmin(request: NextRequest) {
  const token = await verifyAuth(request);
  if (!token) return null;

  // Fast path: custom claim set by admin SDK
  if (token.isAdmin === true) return token;

  // Fallback: check Firestore (for accounts where claim hasn't been set yet)
  const admin = initializeAdmin();
  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(token.uid)
    .get();
  if (userDoc.data()?.isAdmin === true) return token;

  return null;
}
