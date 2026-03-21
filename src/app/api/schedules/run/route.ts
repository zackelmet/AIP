import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { FieldValue, Transaction } from 'firebase-admin/firestore';

/**
 * POST /api/schedules/run
 *
 * Cron endpoint — fires all schedules whose nextRunAt ≤ now and status = active.
 * For each one it:
 *   1. Checks the user has a credit for the pentest type
 *   2. Deducts the credit + creates a pentest doc (atomic transaction)
 *   3. Fires the Make.com webhook
 *   4. Writes a run record under schedules/{id}/runs
 *   5. Advances nextRunAt
 *
 * Secured by CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find all active schedules due to run
    const dueSchedules = await adminDb
      .collection('schedules')
      .where('status', '==', 'active')
      .where('nextRunAt', '<=', now)
      .get();

    if (dueSchedules.empty) {
      return NextResponse.json({ message: 'No schedules due', processed: 0 });
    }

    const results: Array<{ scheduleId: string; status: string; pentestId?: string; error?: string }> = [];

    for (const scheduleDoc of dueSchedules.docs) {
      const schedule = scheduleDoc.data();
      const scheduleId = scheduleDoc.id;

      try {
        const creditType = schedule.type === 'web_app' ? 'web_app' : 'external_ip';
        const userRef = adminDb.collection('users').doc(schedule.userId);
        const pentestRef = adminDb.collection('pentests').doc();

        let creditAvailable = false;

        // Transaction: check credit, deduct, create pentest
        await adminDb.runTransaction(async (transaction: Transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) {
            throw new Error('user_not_found');
          }

          const credits = userDoc.data()?.credits || {};
          const available = credits[creditType] || 0;

          if (available < 1) {
            creditAvailable = false;
            throw new Error('no_credits');
          }

          creditAvailable = true;

          // Deduct credit
          transaction.update(userRef, {
            [`credits.${creditType}`]: FieldValue.increment(-1),
          });

          // Create pentest
          transaction.set(pentestRef, {
            id: pentestRef.id,
            userId: schedule.userId,
            type: schedule.type,
            targetUrl: schedule.targetUrl,
            userRoles: schedule.userRoles || null,
            endpoints: schedule.endpoints || null,
            additionalContext: schedule.additionalContext || null,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            results: null,
            vulnerabilities: [],
            completedAt: null,
            scheduledBy: scheduleId,
          });
        });

        // Update schedule: advance nextRunAt, increment totalRuns
        const nextRunAt = new Date(now.getTime() + schedule.intervalDays * 24 * 60 * 60 * 1000);
        await scheduleDoc.ref.update({
          nextRunAt,
          lastRunAt: now,
          totalRuns: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Record the run
        await scheduleDoc.ref.collection('runs').add({
          scheduleId,
          pentestId: pentestRef.id,
          status: 'pending',
          ranAt: FieldValue.serverTimestamp(),
          creditDeducted: true,
        });

        // Fire Make.com webhook (non-blocking on failure)
        const makeWebhookUrl = 'https://hook.us2.make.com/ct4m2lrjs7e64yu94jaoyaesmto3crsd';
        try {
          const userDoc = await userRef.get();
          await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pentestId: pentestRef.id,
              userId: schedule.userId,
              userEmail: userDoc.data()?.email || null,
              type: schedule.type,
              targetUrl: schedule.targetUrl,
              userRoles: schedule.userRoles || null,
              endpoints: schedule.endpoints || null,
              additionalContext: schedule.additionalContext || null,
              callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/pentests`,
              webhookSecret: process.env.GCP_WEBHOOK_SECRET || '',
              scheduledRun: true,
              scheduleId,
            }),
          });
        } catch (webhookErr) {
          console.error(`Webhook failed for schedule ${scheduleId}:`, webhookErr);
        }

        results.push({ scheduleId, status: 'launched', pentestId: pentestRef.id });
      } catch (err: any) {
        if (err.message === 'no_credits') {
          // Log a skipped run — user has no credits
          await scheduleDoc.ref.collection('runs').add({
            scheduleId,
            pentestId: null,
            status: 'skipped_no_credits',
            ranAt: FieldValue.serverTimestamp(),
            creditDeducted: false,
          });

          // Pause the schedule when credits run out
          await scheduleDoc.ref.update({
            status: 'paused',
            updatedAt: FieldValue.serverTimestamp(),
          });

          results.push({ scheduleId, status: 'skipped_no_credits' });
        } else {
          console.error(`Schedule ${scheduleId} failed:`, err);
          results.push({ scheduleId, status: 'error', error: err.message });
        }
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} schedule(s)`,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Cron schedule runner error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
