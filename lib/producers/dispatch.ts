/**
 * Producer Dispatch Router — Austria Imperial Green Gold
 *
 * Sendet Fulfillment Orders an den richtigen Produzenten.
 *
 * FLOW:
 * 1. createOrder() erstellt fulfillment_orders mit status: 'pending'
 * 2. dispatchFulfillmentOrders() wird aufgerufen
 * 3. Pro fulfillment_order: Lade Items, baue Payload, sende an Producer
 * 4. Update: status, external_order_id, sent_at
 * 5. Log: fulfillment_events + audit_log
 *
 * REGELN:
 * - Fehler in EINEM fulfillment_order darf ANDERE nicht blockieren
 * - retry_count + last_error werden aktualisiert bei Fehler
 * - Financial Ledger wird NICHT berührt (ist schon durch createOrder gesetzt)
 */

import { db } from '@/lib/db/drizzle';
import {
  fulfillmentOrders,
  fulfillmentEvents,
  orders,
  orderItems,
  auditLog,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getProducer } from './index';
import type {
  ProducerOrderPayload,
  ProducerOrderItem,
  ProducerShippingAddress,
} from './types';
import { updateFulfillmentInAirtable, logCommunicationToAirtable } from '@/lib/airtable/sync';
import { COMM_TYPE } from '@/lib/airtable/types';

/**
 * Dispatch all pending fulfillment orders for a given order.
 *
 * Called after createOrder() in the Stripe webhook flow.
 * Each fulfillment_order is dispatched independently — one failure
 * does not block others (important for bundle orders).
 */
export async function dispatchFulfillmentOrders(orderId: number): Promise<{
  dispatched: number;
  failed: number;
  results: Array<{ fulfillmentOrderId: number; success: boolean; error?: string }>;
}> {
  // Load fulfillment orders for this order that are still pending
  const fos = await db.query.fulfillmentOrders.findMany({
    where: and(
      eq(fulfillmentOrders.orderId, orderId),
      eq(fulfillmentOrders.status, 'pending')
    ),
  });

  if (fos.length === 0) {
    console.log(`[Dispatch] No pending fulfillment orders for order ${orderId}`);
    return { dispatched: 0, failed: 0, results: [] };
  }

  // Load the parent order
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: {
        with: {
          productVariant: {
            with: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error(`[Dispatch] Order ${orderId} not found`);
  }

  const results: Array<{ fulfillmentOrderId: number; success: boolean; error?: string }> = [];
  let dispatched = 0;
  let failed = 0;

  for (const fo of fos) {
    const result = await dispatchSingleFulfillment(fo, order);
    results.push(result);
    if (result.success) dispatched++;
    else failed++;
  }

  console.log(
    `[Dispatch] Order ${order.orderNumber}: ${dispatched} dispatched, ${failed} failed`
  );

  return { dispatched, failed, results };
}

/**
 * Dispatch (or retry) a single fulfillment order.
 *
 * Public so the Admin retry endpoint can call it directly.
 */
export async function dispatchSingleFulfillment(
  fo: typeof fulfillmentOrders.$inferSelect,
  order?: Awaited<ReturnType<typeof loadOrderWithItems>>
): Promise<{ fulfillmentOrderId: number; success: boolean; error?: string }> {
  // Load order if not passed (for retry scenarios)
  if (!order) {
    order = await loadOrderWithItems(fo.orderId);
    if (!order) {
      return {
        fulfillmentOrderId: fo.id,
        success: false,
        error: `Order ${fo.orderId} not found`,
      };
    }
  }

  const producer = await getProducer(fo.producer);

  // Build the payload with only items for THIS producer
  const producerItems: ProducerOrderItem[] = order.items
    .filter((item) => item.producer === fo.producer)
    .map((item) => ({
      sku: item.productVariant.sku,
      productName: item.productVariant.product.nameDe,
      variantName: item.productVariant.nameDe,
      quantity: item.quantity,
      sizeMl: item.productVariant.sizeMl,
      weightGrams: item.productVariant.weightGrams,
    }));

  if (producerItems.length === 0) {
    // Edge case: no items for this producer (data inconsistency)
    const error = `No items for producer ${fo.producer} in order ${order.orderNumber}`;
    await updateFulfillmentFailed(fo.id, error);
    return { fulfillmentOrderId: fo.id, success: false, error };
  }

  const payload: ProducerOrderPayload = {
    fulfillmentOrderId: fo.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    items: producerItems,
    shipping: {
      name: order.shippingName ?? '',
      street: order.shippingStreet ?? '',
      street2: order.shippingStreet2 ?? undefined,
      city: order.shippingCity ?? '',
      state: order.shippingState ?? undefined,
      postalCode: order.shippingPostalCode ?? '',
      country: order.shippingCountry ?? 'AT',
    },
    customerEmail: order.guestEmail ?? undefined,
    notes: order.notes ?? undefined,
  };

  // ─── Send to producer ───────────────────────────
  const result = await producer.sendOrder(payload);

  if (result.success) {
    // Update fulfillment order
    await db
      .update(fulfillmentOrders)
      .set({
        status: 'sent_to_producer',
        externalOrderId: result.externalOrderId ?? null,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fulfillmentOrders.id, fo.id));

    // Log event
    await db.insert(fulfillmentEvents).values({
      fulfillmentOrderId: fo.id,
      eventType: 'sent_to_producer',
      payload: {
        method: result.method,
        externalOrderId: result.externalOrderId,
        producerName: fo.producer,
      },
    });

    // Audit
    await db.insert(auditLog).values({
      entityType: 'fulfillment_order',
      entityId: fo.id,
      action: 'dispatched',
      newValues: {
        producer: fo.producer,
        method: result.method,
        externalOrderId: result.externalOrderId,
        orderNumber: order.orderNumber,
      },
      performedBy: 'system',
    });

    console.log(
      `[Dispatch] FO-${fo.id} → ${fo.producer} via ${result.method} ✓`
    );

    // ─── Airtable: update fulfillment + log communication (non-blocking) ──
    try {
      await updateFulfillmentInAirtable({
        fulfillmentOrderId: fo.id,
        producer: fo.producer,
        orderNumber: order.orderNumber,
        status: 'sent_to_producer',
        method: result.method,
        externalOrderId: result.externalOrderId ?? undefined,
      });
      await logCommunicationToAirtable({
        orderNumber: order.orderNumber,
        orderAirtableId: null, // Will be looked up by Bestellnummer if needed
        type: COMM_TYPE.PRODUCER_ORDER,
        recipient: fo.producer,
        subject: `Bestellung ${order.orderNumber} an ${fo.producer}`,
        success: true,
        details: `Versandmethode: ${result.method}`,
      });
    } catch { /* Airtable is non-critical */ }

    return { fulfillmentOrderId: fo.id, success: true };
  } else {
    // Failed — update retry count + error
    await updateFulfillmentFailed(fo.id, result.error ?? 'Unknown error');

    console.error(
      `[Dispatch] FO-${fo.id} → ${fo.producer} FAILED: ${result.error}`
    );

    // ─── Airtable: log dispatch failure (non-blocking) ──
    try {
      await updateFulfillmentInAirtable({
        fulfillmentOrderId: fo.id,
        producer: fo.producer,
        orderNumber: order.orderNumber,
        status: 'failed',
        error: result.error ?? 'Unknown error',
      });
    } catch { /* Airtable is non-critical */ }

    return {
      fulfillmentOrderId: fo.id,
      success: false,
      error: result.error,
    };
  }
}

// ─── Helpers ──────────────────────────────────────

async function loadOrderWithItems(orderId: number) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: {
        with: {
          productVariant: {
            with: {
              product: true,
            },
          },
        },
      },
    },
  });
}

async function updateFulfillmentFailed(fulfillmentOrderId: number, error: string) {
  // Increment retry_count, set last_error, optionally set status to failed
  const current = await db.query.fulfillmentOrders.findFirst({
    where: eq(fulfillmentOrders.id, fulfillmentOrderId),
  });

  const newRetryCount = (current?.retryCount ?? 0) + 1;
  const MAX_RETRIES = 5;

  await db
    .update(fulfillmentOrders)
    .set({
      status: newRetryCount >= MAX_RETRIES ? 'failed' : current?.status ?? 'pending',
      retryCount: newRetryCount,
      lastError: error,
      updatedAt: new Date(),
    })
    .where(eq(fulfillmentOrders.id, fulfillmentOrderId));

  // Log failure event
  await db.insert(fulfillmentEvents).values({
    fulfillmentOrderId,
    eventType: 'dispatch_failed',
    payload: {
      error,
      retryCount: newRetryCount,
      markedAsFailed: newRetryCount >= MAX_RETRIES,
    },
  });

  // Audit
  await db.insert(auditLog).values({
    entityType: 'fulfillment_order',
    entityId: fulfillmentOrderId,
    action: 'dispatch_failed',
    newValues: { error, retryCount: newRetryCount },
    performedBy: 'system',
  });
}
