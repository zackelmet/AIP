import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { initializeAdmin } from '@/lib/firebase/firebaseAdmin';

const admin = initializeAdmin();

export async function GET(request: NextRequest) {
  try {
    const uid = request.cookies.get('uid')?.value;
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pentestId = request.nextUrl.searchParams.get('pentestId');
    if (!pentestId) {
      return NextResponse.json({ error: 'pentestId is required' }, { status: 400 });
    }

    // Fetch the pentest doc
    const pentestDoc = await admin.firestore().collection('pentests').doc(pentestId).get();
    if (!pentestDoc.exists) {
      return NextResponse.json({ error: 'Pentest not found' }, { status: 404 });
    }

    const data = pentestDoc.data()!;

    // Verify the requesting user owns this pentest (or is admin)
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const isAdmin = userDoc.data()?.isAdmin === true;

    if (data.userId !== uid && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!data.reportUrl) {
      return NextResponse.json({ error: 'No report available yet' }, { status: 404 });
    }

    // Generate a signed URL valid for 15 minutes
    const bucket = admin.storage().bucket();
    const file = bucket.file(data.reportUrl);

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
      responseDisposition: `attachment; filename="pentest-report-${pentestId}.pdf"`,
    });

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
