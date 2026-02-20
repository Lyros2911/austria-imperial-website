/**
 * Retry Fulfillment Dispatch API
 *
 * POST /api/admin/fulfillment/retry
 * Body: { fulfillmentOrderId: number }
 *
 * Re-dispatches a failed/pending fulfillment order.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { fulfillmentOrders, auditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { dispatchSingleFulfillment } from '@/lib/producers';
import { z } from 'zod';

const retrySchema = z.object({
  fulfillmentOrderId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = retrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 });
  }

  const fo = await db.query.fulfillmentOrders.findFirst({
    where: eq(fulfillmentOrders.id, parsed.data.fulfillmentOrderId),
  });

  if (!fo) {
    return NextResponse.json({ error: 'Fulfillment Order nicht gefunden' }, { status: 404 });
  }

  // Only retry pending or failed orders
  if (!['pending', 'failed'].includes(fo.status)) {
    return NextResponse.json(
      { error: `Kann nicht wiederholt werden — Status ist "${fo.status}"` },
      { status: 400 }
    );
  }

  // Reset status to pending for retry
  await db
    .update(fulfillmentOrders)
    .set({ status: 'pending', updatedAt: new Date() })
    .where(eq(fulfillmentOrders.id, fo.id));

  // Log manual retry
  await db.insert(auditLog).values({
    entityType: 'fulfillment_order',
    entityId: fo.id,
    action: 'manual_retry',
    newValues: { previousStatus: fo.status, retryCount: fo.retryCount },
    performedBy: session.email,
  });

  // Reset status on the object for dispatch
  const resetFo = { ...fo, status: 'pending' as const };

  const result = await dispatchSingleFulfillment(resetFo);

  return NextResponse.json({
    success: result.success,
    error: result.error,
    fulfillmentOrderId: fo.id,
  });
}
