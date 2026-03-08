import { NextRequest, NextResponse } from 'next/server';
import { initializeAdmin } from '@/lib/firebase/firebaseAdmin';

const admin = initializeAdmin();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const uid = request.cookies.get('uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const callerDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!callerDoc.exists || callerDoc.data()?.isAdmin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const q = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
    if (!q || q.length < 2) return NextResponse.json({ users: [] });

    // Firestore prefix search: email >= q AND email < q\uf8ff
    const snap = await admin
      .firestore()
      .collection('users')
      .where('email', '>=', q)
      .where('email', '<', q + '\uf8ff')
      .orderBy('email')
      .limit(8)
      .get();

    const users = snap.docs.map((doc) => ({
      uid: doc.id,
      email: doc.data().email as string,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('search-users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
