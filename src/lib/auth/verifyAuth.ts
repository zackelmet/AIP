/**
 * Server-side auth helper.
 * Reads the __session cookie (Firebase ID token) and verifies it with
 * Firebase Admin, returning the decoded token (which includes uid, email,
 * and any custom claims).
 *
 * Usage in an API route:
 *   const token = await verifyAuth(request);
 *   if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   const uid = token.uid;
 */

import { NextRequest } from 'next/server';
import { initializeAdmin } from '@/lib/firebase/firebaseAdmin';

export async function verifyAuth(request: NextRequest) {
  const idToken = request.cookies.get('__session')?.value;
  if (!idToken) return null;

  try {
    const admin = initializeAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
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
  const userDoc = await admin.firestore().collection('users').doc(token.uid).get();
  if (userDoc.data()?.isAdmin === true) return token;

  return null;
}
