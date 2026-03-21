import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuth } from '@/lib/auth/verifyAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { scheduleId: string } },
) {
  try {
    const token = await verifyAuth(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.uid;
    const { scheduleId } = params;

    const body = await request.json();
    const { action } = body; // 'pause' | 'resume' | 'cancel'

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be pause, resume, or cancel' },
        { status: 400 },
      );
    }

    const scheduleRef = adminDb.collection('schedules').doc(scheduleId);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const scheduleData = scheduleDoc.data();
    if (scheduleData?.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let newStatus: string;
    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    switch (action) {
      case 'pause':
        if (scheduleData?.status !== 'active') {
          return NextResponse.json(
            { error: 'Can only pause active schedules' },
            { status: 400 },
          );
        }
        newStatus = 'paused';
        break;

      case 'resume':
        if (scheduleData?.status !== 'paused') {
          return NextResponse.json(
            { error: 'Can only resume paused schedules' },
            { status: 400 },
          );
        }
        newStatus = 'active';
        // Recalculate next run from now
        const nextRunAt = new Date(
          Date.now() + (scheduleData.intervalDays || 30) * 24 * 60 * 60 * 1000,
        );
        updateData.nextRunAt = nextRunAt;
        break;

      case 'cancel':
        if (scheduleData?.status === 'cancelled') {
          return NextResponse.json(
            { error: 'Schedule is already cancelled' },
            { status: 400 },
          );
        }
        newStatus = 'cancelled';
        break;

      default:
        newStatus = scheduleData?.status;
    }

    updateData.status = newStatus;
    await scheduleRef.update(updateData);

    return NextResponse.json({
      message: `Schedule ${action}d successfully`,
      status: newStatus,
    });
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { scheduleId: string } },
) {
  try {
    const token = await verifyAuth(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.uid;
    const { scheduleId } = params;

    const scheduleRef = adminDb.collection('schedules').doc(scheduleId);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const scheduleData = scheduleDoc.data();
    if (scheduleData?.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch runs sub-collection
    const runsSnapshot = await scheduleRef
      .collection('runs')
      .orderBy('ranAt', 'desc')
      .limit(50)
      .get();

    const runs = runsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      schedule: { id: scheduleDoc.id, ...scheduleData },
      runs,
    });
  } catch (error: any) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
