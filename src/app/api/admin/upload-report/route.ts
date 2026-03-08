import { NextRequest, NextResponse } from 'next/server';
import { initializeAdmin } from '@/lib/firebase/firebaseAdmin';

const admin = initializeAdmin();

export async function POST(request: NextRequest) {
  try {
    // Verify caller is admin via uid cookie
    const uid = request.cookies.get('uid')?.value;
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse multipart form
    const formData = await request.formData();
    const pentestId = formData.get('pentestId') as string | null;
    const file = formData.get('file') as File | null;

    if (!pentestId || !file) {
      return NextResponse.json({ error: 'pentestId and file are required' }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return NextResponse.json({ error: 'Only PDF and DOCX files are accepted' }, { status: 400 });
    }

    // Determine extension
    const ext = file.type === 'application/pdf' ? 'pdf' : 'docx';

    // Verify pentest doc exists
    const pentestRef = admin.firestore().collection('pentests').doc(pentestId);
    const pentestDoc = await pentestRef.get();
    if (!pentestDoc.exists) {
      return NextResponse.json({ error: 'Pentest not found' }, { status: 404 });
    }

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const storagePath = `reports/${pentestId}.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const storageFile = bucket.file(storagePath);
    await storageFile.save(fileBuffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: uid,
          pentestId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Write the storage path back to the pentest doc
    await pentestRef.update({
      reportUrl: storagePath,
      reportUploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, storagePath });
  } catch (error) {
    console.error('Error uploading report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
