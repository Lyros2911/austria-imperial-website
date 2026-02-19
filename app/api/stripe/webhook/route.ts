/**
 * Stripe Webhook Handler — Austria Imperial Green Gold
 *
 * EVENTS:
 * - checkout.session.completed → Create Order + Ledger Entry
 * - charge.refunded → Process Refund (negative Ledger Entry)
 *
 * PRODUCTION HARDENING:
 * - Signatur validieren (STRIPE_WEBHOOK_SECRET)
 * - balance_transaction expandieren für exakte Stripe Fee
 * - Idempotent auf SESSION- und EVENT-Level
 * - Refund-Idempotenz via stripeRefundId
 * - Variant-ID aus Price Metadata (nicht Product!)
 * - Event-ID Logging bei Erfolg + Fehler
 * - Fehlerhafte Events loggen, nicht verschlucken
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, getStripeFeeCents } from '@/lib/payments/stripe';
import { createOrder } from '@/lib/orders/create-order';
import { processRefund } from '@/lib/orders/refund';
import { dispatchFulfillmentOrders } from '@/lib/producers';
import { sendOrderConfirmation, sendOrderNotification } from '@/lib/email/order-confirmation';
import { db } from '@/lib/db/drizzle';
import { orders, financialLedger, auditLog, stripeWebhookEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// ─── Webhook Handler ───────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // ─── Verify Signature ────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Stripe Webhook] Signature verification failed: ${message}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  // ─── Event-ID Deduplication ────────────────────
  // Absolute guarantee: even if session/refund-level checks fail,
  // no Stripe event is ever processed twice.
  const existingEvent = await db.query.stripeWebhookEvents.findFirst({
    where: eq(stripeWebhookEvents.stripeEventId, event.id),
  });

  if (existingEvent) {
    console.log(`[Stripe Webhook] Event ${event.id} already processed — skipping`);
    return NextResponse.json({ received: true, deduplicated: true });
  }

  // ─── Route Events ────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, event.id);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, event.id);
        break;

      default:
        // Log unhandled events but return 200 (Stripe won't retry)
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type} — acknowledging`);
    }

    // Record this event as processed (dedup for future retries)
    await db.insert(stripeWebhookEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Stripe Webhook] Error processing ${event.type} (${event.id}): ${message}`);

    // Log error to audit_log for visibility
    try {
      await db.insert(auditLog).values({
        entityType: 'stripe_webhook',
        entityId: 0,
        action: 'webhook_error',
        newValues: {
          eventType: event.type,
          eventId: event.id,
          error: message,
        },
        performedBy: 'stripe',
      });
    } catch {
      // Don't let audit log failure mask the original error
    }

    // Return 500 so Stripe will retry
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Event Handlers ────────────────────────────

async function handleCheckoutComplete(session: Stripe.Checkout.Session, eventId: string) {
  console.log(`[Stripe Webhook] checkout.session.completed: ${session.id} (event: ${eventId})`);

  // Idempotency check — if order already exists for this session, skip
  const existing = await db.query.orders.findFirst({
    where: (o, { eq }) => eq(o.stripeCheckoutSessionId, session.id),
  });

  if (existing) {
    console.log(`[Stripe Webhook] Order already exists for session ${session.id} — idempotent skip`);
    return;
  }

  // We need the PaymentIntent to get the actual Stripe fee
  if (!session.payment_intent || typeof session.payment_intent !== 'string') {
    throw new Error(`No payment_intent on checkout session ${session.id}`);
  }

  const paymentFeeCents = await getStripeFeeCents(session.payment_intent);

  // Extract shipping and billing from session
  // Stripe v20+: shipping is under collected_information.shipping_details
  const shipping = session.collected_information?.shipping_details;
  const customerDetails = session.customer_details;

  if (!shipping?.address || !customerDetails?.address) {
    throw new Error(`Missing address data on checkout session ${session.id}`);
  }

  // Parse line items from session (requires expansion)
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  });

  // Build cart items from line items metadata
  // IMPORTANT: aigg_variant_id lives in Price metadata (not Product metadata).
  // Product metadata has aigg_product_id. Price metadata has aigg_variant_id + sku.
  const items: Array<{ variantId: number; quantity: number }> = [];
  for (const item of lineItems.data) {
    // First try: Price metadata (set when using stored Stripe Price IDs)
    const priceVariantId = item.price?.metadata?.aigg_variant_id;
    if (priceVariantId) {
      items.push({
        variantId: parseInt(priceVariantId, 10),
        quantity: item.quantity ?? 1,
      });
      continue;
    }

    // Second try: Product metadata (set when using inline price_data fallback)
    const product = item.price?.product;
    if (product && typeof product !== 'string' && !product.deleted) {
      const productVariantId = (product as Stripe.Product).metadata?.aigg_variant_id;
      if (productVariantId) {
        items.push({
          variantId: parseInt(productVariantId, 10),
          quantity: item.quantity ?? 1,
        });
        continue;
      }
    }

    // Neither source had variant ID — log and skip
    console.warn(
      `[Stripe Webhook] Line item missing aigg_variant_id in both price and product metadata: ${item.id}`
    );
  }

  if (items.length === 0) {
    throw new Error(`No valid line items found for session ${session.id}`);
  }

  // Calculate shipping cost (from session's shipping_cost or total_details)
  const shippingCostCents = session.shipping_cost?.amount_total ?? 0;

  // Create the order atomically
  const result = await createOrder({
    guestEmail: customerDetails.email ?? undefined,
    items,
    shipping: {
      name: shipping.name ?? customerDetails.name ?? 'Unknown',
      street: shipping.address.line1 ?? '',
      street2: shipping.address.line2 ?? undefined,
      city: shipping.address.city ?? '',
      state: shipping.address.state ?? undefined,
      postalCode: shipping.address.postal_code ?? '',
      country: shipping.address.country ?? 'AT',
    },
    billing: {
      name: customerDetails.name ?? 'Unknown',
      street: customerDetails.address.line1 ?? '',
      city: customerDetails.address.city ?? '',
      postalCode: customerDetails.address.postal_code ?? '',
      country: customerDetails.address.country ?? 'AT',
    },
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    shippingCostCents,
    paymentFeeCents,
    locale: session.locale ?? 'de',
  });

  console.log(
    `[Stripe Webhook] Order created: ${result.orderNumber} ` +
    `(${result.fulfillmentOrderIds.length} fulfillment orders, ledger: ${result.ledgerId}, event: ${eventId})`
  );

  // ─── Dispatch to Producers (non-blocking) ──────
  // Dispatch happens AFTER the order is committed.
  // Failures are logged but don't fail the webhook response.
  try {
    const dispatchResult = await dispatchFulfillmentOrders(result.orderId);
    console.log(
      `[Stripe Webhook] Dispatch: ${dispatchResult.dispatched} sent, ${dispatchResult.failed} failed`
    );
  } catch (dispatchErr) {
    // Log but don't throw — the order is already saved.
    // Admin can retry manually via dashboard.
    const errMsg = dispatchErr instanceof Error ? dispatchErr.message : 'Unknown dispatch error';
    console.error(`[Stripe Webhook] Dispatch failed (non-critical): ${errMsg}`);
    try {
      await db.insert(auditLog).values({
        entityType: 'fulfillment_dispatch',
        entityId: result.orderId,
        action: 'dispatch_error',
        newValues: { error: errMsg, orderNumber: result.orderNumber },
        performedBy: 'system',
      });
    } catch { /* don't mask original error */ }
  }

  // ─── Send Order Emails (non-blocking) ──────────
  // Confirmation to customer + notification to shop owner.
  // Failures are logged but don't affect the webhook response.
  try {
    // Build email data from session + result
    const emailItems = lineItems.data.map((li) => {
      const product = li.price?.product;
      const productName = (product && typeof product !== 'string' && !product.deleted)
        ? (product as Stripe.Product).name
        : 'Produkt';
      return {
        productName,
        variantName: li.description ?? '',
        quantity: li.quantity ?? 1,
        unitPriceCents: li.price?.unit_amount ?? 0,
      };
    });

    // subtotalCents and totalCents are calculated inside createOrder,
    // recalculate for the email
    const emailSubtotal = emailItems.reduce((sum, i) => sum + (i.unitPriceCents * i.quantity), 0);
    const emailTotal = emailSubtotal + shippingCostCents;

    const emailData = {
      orderNumber: result.orderNumber,
      customerEmail: customerDetails.email ?? '',
      customerName: shipping.name ?? customerDetails.name ?? 'Kunde',
      items: emailItems,
      subtotalCents: emailSubtotal,
      shippingCents: shippingCostCents,
      totalCents: emailTotal,
      shipping: {
        name: shipping.name ?? '',
        street: shipping.address.line1 ?? '',
        street2: shipping.address.line2 ?? undefined,
        city: shipping.address.city ?? '',
        postalCode: shipping.address.postal_code ?? '',
        country: shipping.address.country ?? 'AT',
      },
    };

    if (emailData.customerEmail) {
      await Promise.allSettled([
        sendOrderConfirmation(emailData),
        sendOrderNotification(emailData),
      ]);
      console.log(`[Stripe Webhook] Order emails sent for ${result.orderNumber}`);
    }
  } catch (emailErr) {
    const errMsg = emailErr instanceof Error ? emailErr.message : 'Unknown email error';
    console.error(`[Stripe Webhook] Order email failed (non-critical): ${errMsg}`);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge, eventId: string) {
  console.log(`[Stripe Webhook] charge.refunded: ${charge.id} (event: ${eventId})`);

  // Find the order by payment_intent
  if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
    throw new Error(`No payment_intent on charge ${charge.id}`);
  }

  const order = await db.query.orders.findFirst({
    where: (o, { eq }) => eq(o.stripePaymentIntentId, charge.payment_intent as string),
  });

  if (!order) {
    throw new Error(`No order found for payment_intent ${charge.payment_intent}`);
  }

  // Calculate total refunded amount from Stripe
  const totalRefundedCents = charge.amount_refunded;

  if (totalRefundedCents <= 0) {
    console.log(`[Stripe Webhook] No refund amount on charge ${charge.id} — skipping`);
    return;
  }

  // Get the latest refund from the charge
  const latestRefund = charge.refunds?.data?.[0];

  if (!latestRefund) {
    throw new Error(`No refund data on charge ${charge.id}`);
  }

  // ─── Refund Idempotency ────────────────────────
  // Check if we already processed this specific Stripe refund.
  // Without this, Stripe retries would create duplicate negative ledger entries.
  if (latestRefund.id) {
    const existingRefundEntry = await db.query.financialLedger.findFirst({
      where: (fl, { and, eq, like }) =>
        and(
          eq(fl.orderId, order.id),
          like(fl.notes, `%${latestRefund.id}%`)
        ),
    });

    if (existingRefundEntry) {
      console.log(
        `[Stripe Webhook] Refund ${latestRefund.id} already processed for order ${order.orderNumber} — idempotent skip`
      );
      return;
    }
  }

  const result = await processRefund({
    orderId: order.id,
    refundAmountCents: latestRefund.amount ?? totalRefundedCents,
    stripeRefundId: latestRefund.id,
    reason: latestRefund.reason ?? 'Stripe refund',
    performedBy: 'stripe',
  });

  console.log(
    `[Stripe Webhook] Refund processed: ${result.entryType} for order ${order.orderNumber} ` +
    `(refund: ${latestRefund.id}, event: ${eventId})`
  );
}
