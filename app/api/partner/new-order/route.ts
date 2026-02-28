/**
 * Partner New B2B Order API
 * POST /api/partner/new-order — Create a new B2B order from the partner portal
 *
 * Validates items against the partner's active price list,
 * calculates totals, and creates the order with items atomically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/auth/partner';
import { dbPool } from '@/lib/db/drizzle';
import {
  partnerPriceLists,
  partnerOrders,
  partnerOrderItems,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const orderItemSchema = z.object({
  productVariantId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getPartnerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { items, notes } = parsed.data;

  // Look up prices for all requested variants from this partner's active price list
  const variantIds = items.map((i) => i.productVariantId);
  const priceEntries = await dbPool
    .select({
      productVariantId: partnerPriceLists.productVariantId,
      exportPriceCents: partnerPriceLists.exportPriceCents,
      currency: partnerPriceLists.currency,
    })
    .from(partnerPriceLists)
    .where(
      and(
        eq(partnerPriceLists.partnerConfigId, session.partnerConfigId),
        eq(partnerPriceLists.active, true),
      ),
    );

  // Build a lookup map: variantId -> price info
  const priceMap = new Map(
    priceEntries.map((p) => [p.productVariantId, p]),
  );

  // Validate all items have a price entry
  const missingVariants = variantIds.filter((vid) => !priceMap.has(vid));
  if (missingVariants.length > 0) {
    return NextResponse.json(
      {
        error: 'No active price list entry found for some product variants',
        missingVariantIds: missingVariants,
      },
      { status: 400 },
    );
  }

  // Generate order number
  const orderNumber = `B2B-${Date.now().toString(36).toUpperCase()}`;

  // Calculate totals and prepare order items
  const orderItemsData = items.map((item) => {
    const price = priceMap.get(item.productVariantId)!;
    const unitPriceCents = price.exportPriceCents;
    const totalCents = item.quantity * unitPriceCents;
    return {
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPriceCents,
      totalCents,
    };
  });

  const totalCents = orderItemsData.reduce((sum, i) => sum + i.totalCents, 0);

  // Determine currency from first item (all items should share the same currency)
  const currency = priceMap.get(items[0].productVariantId)!.currency;

  // Create order + items in a transaction
  const result = await dbPool.transaction(async (tx) => {
    const [order] = await tx
      .insert(partnerOrders)
      .values({
        partnerConfigId: session.partnerConfigId,
        orderNumber,
        status: 'submitted',
        totalCents,
        currency,
        notes: notes || null,
        submittedBy: session.email,
        submittedAt: new Date(),
      })
      .returning({
        id: partnerOrders.id,
        orderNumber: partnerOrders.orderNumber,
      });

    await tx.insert(partnerOrderItems).values(
      orderItemsData.map((item) => ({
        partnerOrderId: order.id,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
      })),
    );

    return order;
  });

  return NextResponse.json(
    { success: true, orderNumber: result.orderNumber },
    { status: 201 },
  );
}
