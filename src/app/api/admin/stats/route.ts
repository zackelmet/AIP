import { NextRequest, NextResponse } from 'next/server';
import { initializeAdmin } from '@/lib/firebase/firebaseAdmin';
import { verifyAdmin } from '@/lib/auth/verifyAuth';

const admin = initializeAdmin();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = await verifyAdmin(request);
    if (!token) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Count all users
    const usersSnap = await admin.firestore().collection('users').count().get();
    const totalUsers = usersSnap.data().count;

    return NextResponse.json({ totalUsers });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
