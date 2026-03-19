import { NextRequest, NextResponse } from 'next/server';
import { initializeAdmin } from '@/lib/firebase/firebaseAdmin';
import { verifyAdmin } from '@/lib/auth/verifyAuth';

const admin = initializeAdmin();

export const dynamic = 'force-dynamic';

// Allow up to 20 MB file uploads (Next.js App Router default is 4 MB)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Verify caller is admin via cryptographically verified ID token
    const token = await verifyAdmin(request);
    if (!token) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const uid = token.uid;

    // Parse multipart form
    const formData = await request.formData();
    const pentestId = formData.get('pentestId') as string | null;
    const file = formData.get('file') as File | null;

    if (!pentestId || !file) {
      return NextResponse.json({ error: 'pentestId and file are required' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
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

    // Resolve bucket — trim whitespace and strip any surrounding quotes from env var
    const bucketName = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '')
      .trim()
      .replace(/^["']|["']$/g, '');
    if (!bucketName) {
      console.error('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set');
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }
    console.log('Using storage bucket:', bucketName);

    const bucket = admin.storage().bucket(bucketName);
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
  } catch (error: any) {
    console.error('Error uploading report:', error?.message ?? error);
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
