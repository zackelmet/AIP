import { NextRequest, NextResponse } from 'next/server';
import { initializeAdmin } from '@/lib/firebase/firebaseAdmin';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = '__session';
// 1 hour — client refreshes the token before it expires
const MAX_AGE = 60 * 60;

/**
 * POST /api/auth/session
 * Body: { idToken: string }
 * Sets an httpOnly __session cookie containing the verified Firebase ID token.
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'idToken required' }, { status: 400 });
    }

    // Verify the token is genuine before storing it
    const admin = initializeAdmin();
    await admin.auth().verifyIdToken(idToken);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, idToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   MAX_AGE,
      path:     '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

/**
 * DELETE /api/auth/session
 * Clears the __session cookie on sign-out.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,
    path:     '/',
  });
  return response;
}
