import { NextRequest, NextResponse } from 'next/server';
import { initializeAdmin } from '@/lib/firebase/firebaseAdmin';

const admin = initializeAdmin();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const uid = request.cookies.get('uid')?.value;
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Count all users
    const usersSnap = await admin.firestore().collection('users').count().get();
    const totalUsers = usersSnap.data().count;

    return NextResponse.json({ totalUsers });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
