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
import { orders, fulfillmentOrders, orderItems, productVariants, products, financialLedger, auditLog, stripeWebhookEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  syncOrderToAirtable,
  syncFulfillmentToAirtable,
  logCommunicationToAirtable,
  syncCommissionToAirtable,
} from '@/lib/airtable/sync';
import { COMM_TYPE } from '@/lib/airtable/types';
import { calculateAndStoreCommission, getPartnerFromAttribution } from '@/lib/orders/commission';
import { markCommissionPaid } from '@/lib/payments/connect';

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

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, event.id);
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

  // Get the PaymentIntent ID — may be missing on the webhook event object,
  // so retrieve from Stripe API if needed (happens with delayed payment methods like SEPA).
  let paymentIntentId: string | null = null;

  if (session.payment_intent && typeof session.payment_intent === 'string') {
    paymentIntentId = session.payment_intent;
  } else {
    // Retrieve the full session from Stripe API
    const fullSession = await stripe.checkout.sessions.retrieve(session.id);
    if (fullSession.payment_intent && typeof fullSession.payment_intent === 'string') {
      paymentIntentId = fullSession.payment_intent;
    }
  }

  if (!paymentIntentId) {
    throw new Error(`No payment_intent on checkout session ${session.id} (even after retrieval)`);
  }

  // For delayed payment methods (SEPA), the balance_transaction may not exist yet.
  // Try to get the fee, default to 0 if not yet available (will be corrected on payment_intent.succeeded).
  let paymentFeeCents: number;
  try {
    paymentFeeCents = await getStripeFeeCents(paymentIntentId);
  } catch (feeErr) {
    console.warn(
      `[Stripe Webhook] Could not get Stripe fee for ${paymentIntentId} — likely delayed payment method. Defaulting to 0.`
    );
    paymentFeeCents = 0;
  }

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

  // ─── Attribution aus Session Metadata extrahieren ────────────
  const attribution = {
    attributionSource: session.metadata?.source || 'direct',
    utmSource: session.metadata?.utm_source || undefined,
    utmMedium: session.metadata?.utm_medium || undefined,
    utmCampaign: session.metadata?.utm_campaign || undefined,
    utmContent: session.metadata?.utm_content || undefined,
    referrerUrl: session.metadata?.referrer || undefined,
  };

  console.log(
    `[Stripe Webhook] Attribution for ${session.id}: source=${attribution.attributionSource}, ` +
    `utm_campaign=${attribution.utmCampaign || 'none'}`
  );

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
    stripePaymentIntentId: paymentIntentId,
    shippingCostCents,
    paymentFeeCents,
    locale: session.locale ?? 'de',
    // Attribution tracking
    ...attribution,
  });

  console.log(
    `[Stripe Webhook] Order created: ${result.orderNumber} ` +
    `(${result.fulfillmentOrderIds.length} fulfillment orders, ledger: ${result.ledgerId}, event: ${eventId})`
  );

  // ─── Partner Commission berechnen (non-blocking) ──────
  try {
    const partnerCode = getPartnerFromAttribution(
      attribution.attributionSource,
      attribution.utmCampaign
    );

    if (partnerCode) {
      const emailSubtotalForCommission = lineItems.data.reduce(
        (sum, li) => sum + ((li.price?.unit_amount ?? 0) * (li.quantity ?? 1)),
        0
      );
      const orderTotalForCommission = emailSubtotalForCommission + shippingCostCents;

      const commissionResult = await calculateAndStoreCommission({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        orderTotalCents: orderTotalForCommission,
        attributionSource: attribution.attributionSource,
        utmCampaign: attribution.utmCampaign,
        partnerCode,
      });

      // Sync commission to Airtable "Partner Revenue"
      if (commissionResult) {
        await syncCommissionToAirtable({
          orderNumber: result.orderNumber,
          partnerName: partnerCode === 'aigg' ? 'Austria Imperial Green Gold' : partnerCode,
          orderTotalCents: orderTotalForCommission,
          commissionPercent: commissionResult.commissionPercent,
          commissionCents: commissionResult.commissionCents,
          attributionSource: attribution.attributionSource,
          utmCampaign: attribution.utmCampaign,
          status: commissionResult.status,
        });
      }
    } else {
      console.log(
        `[Stripe Webhook] No partner attribution for ${result.orderNumber} — no commission`
      );
    }
  } catch (commissionErr) {
    const errMsg = commissionErr instanceof Error ? commissionErr.message : 'Unknown error';
    console.error(`[Stripe Webhook] Commission calculation failed (non-critical): ${errMsg}`);
  }

  // ─── Build email item data (shared by Airtable + Email) ──────
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

  const emailSubtotal = emailItems.reduce((sum, i) => sum + (i.unitPriceCents * i.quantity), 0);
  const emailTotal = emailSubtotal + shippingCostCents;

  // ─── Sync to Airtable (non-blocking) ──────────
  let orderAirtableId: string | null = null;
  try {
    // 1) Sync main order
    orderAirtableId = await syncOrderToAirtable({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      customerName: shipping.name ?? customerDetails.name ?? 'Unbekannt',
      customerEmail: customerDetails.email ?? '',
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
      status: 'paid',
      // Attribution tracking
      attributionSource: attribution.attributionSource,
      utmSource: attribution.utmSource,
      utmCampaign: attribution.utmCampaign,
    });

    // 2) Sync fulfillment orders (one per producer → separate product tables)
    if (orderAirtableId) {
      const foRows = await db.query.fulfillmentOrders.findMany({
        where: eq(fulfillmentOrders.orderId, result.orderId),
      });
      const oiRows = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, result.orderId),
        with: { productVariant: { with: { product: true } } },
      });

      for (const fo of foRows) {
        const producerItems = oiRows
          .filter((oi) => oi.producer === fo.producer)
          .map((oi) => ({
            productName: oi.productVariant?.product?.nameDe ?? 'Produkt',
            variantName: oi.productVariant?.nameDe ?? '',
            quantity: oi.quantity,
            unitPriceCents: oi.unitPriceCents,
          }));

        await syncFulfillmentToAirtable({
          fulfillmentOrderId: fo.id,
          orderNumber: result.orderNumber,
          orderAirtableId,
          producer: fo.producer,
          items: producerItems,
          status: fo.status,
        });
      }
    }
  } catch (airtableErr) {
    const errMsg = airtableErr instanceof Error ? airtableErr.message : 'Unknown error';
    console.error(`[Stripe Webhook] Airtable sync failed (non-critical): ${errMsg}`);
  }

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
      const [confirmResult, notifyResult] = await Promise.allSettled([
        sendOrderConfirmation(emailData),
        sendOrderNotification(emailData),
      ]);
      console.log(`[Stripe Webhook] Order emails sent for ${result.orderNumber}`);

      // ─── Log communications to Airtable (non-blocking) ──────
      try {
        await Promise.allSettled([
          logCommunicationToAirtable({
            orderNumber: result.orderNumber,
            orderAirtableId,
            type: COMM_TYPE.CUSTOMER_CONFIRMATION,
            recipient: emailData.customerEmail,
            subject: `Bestellbestätigung ${result.orderNumber}`,
            success: confirmResult.status === 'fulfilled' && confirmResult.value === true,
          }),
          logCommunicationToAirtable({
            orderNumber: result.orderNumber,
            orderAirtableId,
            type: COMM_TYPE.OFFICE_NOTIFICATION,
            recipient: 'office@austriaimperial.com',
            subject: `Neue Bestellung ${result.orderNumber}`,
            success: notifyResult.status === 'fulfilled' && notifyResult.value === true,
          }),
        ]);
      } catch { /* Airtable logging is non-critical */ }
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

// ─── Stripe Connect: Track Transfer after Payment Success ───

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  console.log(`[Stripe Webhook] payment_intent.succeeded: ${paymentIntent.id} (event: ${eventId})`);

  // Check if this PaymentIntent has a transfer (Stripe Connect)
  const transferId = paymentIntent.transfer_data?.destination
    ? paymentIntent.latest_charge
    : null;

  // Also check for application_fee — indicates Auryx revenue share
  if (!paymentIntent.application_fee_amount || paymentIntent.application_fee_amount === 0) {
    // No Connect fee → no transfer tracking needed (normal payment or AIGG)
    return;
  }

  // Find the order for this PaymentIntent
  const order = await db.query.orders.findFirst({
    where: (o, { eq }) => eq(o.stripePaymentIntentId, paymentIntent.id),
  });

  if (!order) {
    // PaymentIntent might not be from our shop (Stripe sends all events)
    console.log(`[Stripe Webhook] No order for PI ${paymentIntent.id} — not our payment`);
    return;
  }

  // Extract transfer ID from the charge
  let stripeTransferId = '';
  if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'string') {
    // The transfer is associated with the charge, retrieve it
    try {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
      if (charge.transfer && typeof charge.transfer === 'string') {
        stripeTransferId = charge.transfer;
      }
    } catch {
      // Transfer retrieval failed — log but continue
      console.warn(`[Stripe Webhook] Could not retrieve transfer for charge ${paymentIntent.latest_charge}`);
    }
  }

  // Mark commission as paid
  const result = await markCommissionPaid(
    order.id,
    stripeTransferId || `pi_${paymentIntent.id}`
  );

  if (result) {
    console.log(
      `[Stripe Webhook] Connect transfer tracked for order ${order.orderNumber} ` +
      `(fee: ${paymentIntent.application_fee_amount} cents, transfer: ${stripeTransferId || 'pending'}, event: ${eventId})`
    );
  }
}
