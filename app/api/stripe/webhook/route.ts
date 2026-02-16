/**
 * Stripe Webhook Handler — Austria Imperial Green Gold
 *
 * EVENTS:
 * - checkout.session.completed → Create Order + Ledger Entry
 * - charge.refunded → Process Refund (negative Ledger Entry)
 *
 * PFLICHT:
 * - Signatur validieren (STRIPE_WEBHOOK_SECRET)
 * - balance_transaction expandieren für exakte Stripe Fee
 * - Idempotent arbeiten (stripe_checkout_session_id UNIQUE)
 * - Fehlerhafte Events loggen, nicht verschlucken
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, getStripeFeeCents } from '@/lib/payments/stripe';
import { createOrder } from '@/lib/orders/create-order';
import { processRefund } from '@/lib/orders/refund';
import { dispatchFulfillmentOrders } from '@/lib/producers';
import { db } from '@/lib/db/drizzle';
import { orders, auditLog } from '@/lib/db/schema';
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

  // ─── Route Events ────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        // Log unhandled events but return 200 (Stripe won't retry)
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Stripe Webhook] Error processing ${event.type}: ${message}`);

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

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log(`[Stripe Webhook] checkout.session.completed: ${session.id}`);

  // Idempotency check — if order already exists for this session, skip
  const existing = await db.query.orders.findFirst({
    where: (o, { eq }) => eq(o.stripeCheckoutSessionId, session.id),
  });

  if (existing) {
    console.log(`[Stripe Webhook] Order already exists for session ${session.id} — skipping`);
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
  const items: Array<{ variantId: number; quantity: number }> = [];
  for (const item of lineItems.data) {
    const product = item.price?.product;
    if (!product || typeof product === 'string' || product.deleted) continue;

    const variantId = (product as Stripe.Product).metadata?.aigg_variant_id;
    if (!variantId) {
      console.warn(`[Stripe Webhook] Line item missing aigg_variant_id metadata: ${item.id}`);
      continue;
    }

    items.push({
      variantId: parseInt(variantId, 10),
      quantity: item.quantity ?? 1,
    });
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
    `[Stripe Webhook] Order created: ${result.orderNumber} (${result.fulfillmentOrderIds.length} fulfillment orders)`
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
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`[Stripe Webhook] charge.refunded: ${charge.id}`);

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

  const result = await processRefund({
    orderId: order.id,
    refundAmountCents: latestRefund?.amount ?? totalRefundedCents,
    stripeRefundId: latestRefund?.id,
    reason: latestRefund?.reason ?? 'Stripe refund',
    performedBy: 'stripe',
  });

  console.log(
    `[Stripe Webhook] Refund processed: ${result.entryType} for order ${order.orderNumber}`
  );
}
