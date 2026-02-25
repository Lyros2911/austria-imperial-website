/**
 * Manual Fulfillment Status Update API
 *
 * POST /api/admin/fulfillment/update-status
 * Body: { fulfillmentOrderId, status, trackingNumber?, trackingUrl? }
 *
 * Used by admin to manually update fulfillment status
 * (e.g. when producer confirms via email/phone).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { fulfillmentOrders, fulfillmentEvents, orders, auditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { updateFulfillmentInAirtable, updateOrderStatusInAirtable } from '@/lib/airtable/sync';

const updateSchema = z.object({
  fulfillmentOrderId: z.number().int().positive(),
  status: z.enum([
    'pending',
    'sent_to_producer',
    'confirmed',
    'shipped',
    'delivered',
    'failed',
    'cancelled',
  ]),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional().or(z.literal('')),
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
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fulfillmentOrderId, status, trackingNumber, trackingUrl } = parsed.data;

  const fo = await db.query.fulfillmentOrders.findFirst({
    where: eq(fulfillmentOrders.id, fulfillmentOrderId),
  });

  if (!fo) {
    return NextResponse.json({ error: 'Fulfillment Order nicht gefunden' }, { status: 404 });
  }

  const oldStatus = fo.status;

  // Build update
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (trackingNumber !== undefined) {
    updateData.trackingNumber = trackingNumber || null;
  }
  if (trackingUrl !== undefined) {
    updateData.trackingUrl = trackingUrl || null;
  }

  // Set timestamp fields based on status
  if (status === 'confirmed' && !fo.confirmedAt) {
    updateData.confirmedAt = new Date();
  }
  if (status === 'shipped' && !fo.shippedAt) {
    updateData.shippedAt = new Date();
  }
  if (status === 'delivered' && !fo.deliveredAt) {
    updateData.deliveredAt = new Date();
  }

  await db
    .update(fulfillmentOrders)
    .set(updateData)
    .where(eq(fulfillmentOrders.id, fulfillmentOrderId));

  // Log event
  await db.insert(fulfillmentEvents).values({
    fulfillmentOrderId,
    eventType: `status_${status}`,
    payload: {
      oldStatus,
      newStatus: status,
      trackingNumber: trackingNumber ?? null,
      updatedBy: session.email,
    },
  });

  // Audit
  await db.insert(auditLog).values({
    entityType: 'fulfillment_order',
    entityId: fulfillmentOrderId,
    action: 'manual_status_update',
    oldValues: { status: oldStatus },
    newValues: {
      status,
      trackingNumber: trackingNumber ?? null,
      trackingUrl: trackingUrl ?? null,
    },
    performedBy: session.email,
  });

  // ─── Airtable: update fulfillment + order status (non-blocking) ──
  try {
    // Load parent order for orderNumber + producer mapping
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, fo.orderId),
    });

    if (order) {
      await updateFulfillmentInAirtable({
        fulfillmentOrderId,
        producer: fo.producer,
        orderNumber: order.orderNumber,
        status,
        trackingNumber: trackingNumber ?? undefined,
        trackingUrl: trackingUrl ?? undefined,
      });

      // Update aggregate order status for terminal fulfillment states
      if (['shipped', 'delivered'].includes(status)) {
        await updateOrderStatusInAirtable(order.orderNumber, status);
      }
    }
  } catch {
    // Airtable sync is non-critical
    console.error(`[Admin] Airtable fulfillment update failed (non-critical)`);
  }

  return NextResponse.json({
    success: true,
    fulfillmentOrderId,
    oldStatus,
    newStatus: status,
  });
}
