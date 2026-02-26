/**
 * Create Order — Atomische Order-Erstellung
 *
 * EINE Transaktion erstellt:
 * 1. Order (mit denormalisierter Adresse)
 * 2. Order Items (mit Producer-Zuordnung)
 * 3. Fulfillment Orders (pro Producer — Bundle-Split!)
 * 4. Financial Ledger Entry (Accounting)
 * 5. Audit Log
 *
 * PFLICHT:
 * - stripe_checkout_session_id ist UNIQUE → Idempotenz
 * - Bundle-Bestellungen splitten in 2 Fulfillment Orders (Kiendler + Hernach)
 * - financial_ledger Entry wird sofort erstellt bei Status 'paid'
 */

import { eq } from 'drizzle-orm';
import { dbPool } from '@/lib/db/drizzle';
import {
  orders,
  orderItems,
  fulfillmentOrders,
  auditLog,
  productVariants,
} from '@/lib/db/schema';
import type { NewOrder } from '@/lib/db/schema';
import { generateOrderNumber, getProducerCost } from './utils';
import { createLedgerEntry, type CostBreakdown } from './accounting';

// ─── Types ─────────────────────────────────────

interface CartItem {
  variantId: number;
  quantity: number;
}

interface ShippingAddress {
  name: string;
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2
}

interface BillingAddress {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface CreateOrderInput {
  customerId?: number; // null for guest checkout
  guestEmail?: string;
  items: CartItem[];
  shipping: ShippingAddress;
  billing: BillingAddress;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string;
  shippingCostCents: number;
  paymentFeeCents: number; // from Stripe balance_transaction
  locale?: string;
  notes?: string;
  // Attribution tracking — woher kam die Bestellung?
  attributionSource?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrerUrl?: string;
}

export interface CreateOrderResult {
  orderId: number;
  orderNumber: string;
  fulfillmentOrderIds: number[];
  ledgerId: number;
}

// ─── Main Function ─────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // Validate at least one identifier
  if (!input.customerId && !input.guestEmail) {
    throw new Error('Either customerId or guestEmail must be provided');
  }

  if (input.items.length === 0) {
    throw new Error('Order must have at least one item');
  }

  // Resolve variants from DB (need SKU, price, producer)
  const variantIds = input.items.map((i) => i.variantId);
  const variants = await dbPool.query.productVariants.findMany({
    where: (pv, { inArray }) => inArray(pv.id, variantIds),
    with: { product: true },
  });

  if (variants.length !== variantIds.length) {
    const found = variants.map((v) => v.id);
    const missing = variantIds.filter((id) => !found.includes(id));
    throw new Error(`Variant(s) not found: ${missing.join(', ')}`);
  }

  // Build variant lookup
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  // ─── Begin atomic transaction ─────────────────
  return await dbPool.transaction(async (tx) => {
    const orderNumber = generateOrderNumber();

    // Calculate subtotal
    let subtotalCents = 0;
    const itemsToInsert: Array<{
      productVariantId: number;
      quantity: number;
      unitPriceCents: number;
      totalCents: number;
      producer: 'kiendler' | 'hernach';
    }> = [];

    for (const cartItem of input.items) {
      const variant = variantMap.get(cartItem.variantId)!;
      const lineTotal = variant.priceCents * cartItem.quantity;
      subtotalCents += lineTotal;

      itemsToInsert.push({
        productVariantId: cartItem.variantId,
        quantity: cartItem.quantity,
        unitPriceCents: variant.priceCents,
        totalCents: lineTotal,
        producer: variant.product.producer as 'kiendler' | 'hernach',
      });
    }

    const totalCents = subtotalCents + input.shippingCostCents;

    // 1) Insert Order
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        customerId: input.customerId ?? null,
        guestEmail: input.guestEmail ?? null,
        status: 'paid',
        shippingName: input.shipping.name,
        shippingStreet: input.shipping.street,
        shippingStreet2: input.shipping.street2 ?? null,
        shippingCity: input.shipping.city,
        shippingState: input.shipping.state ?? null,
        shippingPostalCode: input.shipping.postalCode,
        shippingCountry: input.shipping.country,
        billingName: input.billing.name,
        billingStreet: input.billing.street,
        billingCity: input.billing.city,
        billingPostalCode: input.billing.postalCode,
        billingCountry: input.billing.country,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        stripePaymentIntentId: input.stripePaymentIntentId,
        subtotalCents,
        shippingCents: input.shippingCostCents,
        totalCents,
        locale: input.locale ?? 'de',
        notes: input.notes ?? null,
        // Attribution tracking
        attributionSource: input.attributionSource ?? 'direct',
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmContent: input.utmContent ?? null,
        referrerUrl: input.referrerUrl ?? null,
      })
      .returning({ id: orders.id });

    // 2) Insert Order Items
    for (const item of itemsToInsert) {
      await tx.insert(orderItems).values({
        orderId: order.id,
        ...item,
      });
    }

    // 3) Create Fulfillment Orders — grouped by producer (Bundle-Split!)
    const producerGroups = new Map<string, typeof itemsToInsert>();
    for (const item of itemsToInsert) {
      const group = producerGroups.get(item.producer) ?? [];
      group.push(item);
      producerGroups.set(item.producer, group);
    }

    const fulfillmentOrderIds: number[] = [];
    for (const [producer] of producerGroups) {
      const [fo] = await tx
        .insert(fulfillmentOrders)
        .values({
          orderId: order.id,
          producer: producer as 'kiendler' | 'hernach',
          status: 'pending',
        })
        .returning({ id: fulfillmentOrders.id });
      fulfillmentOrderIds.push(fo.id);
    }

    // 4) Calculate costs and create Ledger Entry
    let totalProducerCostCents = 0;
    for (const item of itemsToInsert) {
      const variant = variantMap.get(item.productVariantId)!;
      const cost = getProducerCost(variant.sku);
      totalProducerCostCents += cost * item.quantity;
    }

    const costs: CostBreakdown = {
      revenueCents: totalCents,
      producerCostCents: totalProducerCostCents,
      packagingCents: 0, // TODO: Add packaging cost per producer if applicable
      shippingCostCents: input.shippingCostCents,
      paymentFeeCents: input.paymentFeeCents,
      customsCents: 0, // TODO: Calculate customs for international orders
    };

    // createLedgerEntry uses the HTTP driver — we need to do it in-transaction
    // So we inline the insert here for atomicity
    const { calculateGrossProfit, calculateProfitSplit } = await import('./accounting');
    const grossProfitCents = calculateGrossProfit(costs);
    // D2C-Nettoumsatz = Revenue - Payment Fees (Basis für Auryx 10%)
    const d2cNetRevenueCents = costs.revenueCents - costs.paymentFeeCents;
    const split = calculateProfitSplit(grossProfitCents, d2cNetRevenueCents);

    const [ledger] = await tx
      .insert((await import('@/lib/db/schema')).financialLedger)
      .values({
        orderId: order.id,
        entryType: 'sale',
        revenueCents: costs.revenueCents,
        producerCostCents: costs.producerCostCents,
        packagingCents: costs.packagingCents,
        shippingCostCents: costs.shippingCostCents,
        paymentFeeCents: costs.paymentFeeCents,
        customsCents: costs.customsCents,
        grossProfitCents: split.grossProfitCents,
        auryxShareCents: split.auryxShareCents,
        peterShareCents: split.peterShareCents,
        aiggShareCents: split.aiggShareCents,
        notes: `Order ${orderNumber}`,
      })
      .returning({ id: (await import('@/lib/db/schema')).financialLedger.id });

    // 5) Audit Log
    await tx.insert(auditLog).values({
      entityType: 'order',
      entityId: order.id,
      action: 'order_created',
      newValues: {
        orderNumber,
        totalCents,
        items: itemsToInsert.length,
        fulfillmentOrders: fulfillmentOrderIds.length,
        ledgerId: ledger.id,
      },
      performedBy: 'system',
    });

    return {
      orderId: order.id,
      orderNumber,
      fulfillmentOrderIds,
      ledgerId: ledger.id,
    };
  });
}
