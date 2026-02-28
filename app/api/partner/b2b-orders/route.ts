/**
 * Partner B2B Orders API
 * GET /api/partner/b2b-orders — List B2B orders for this partner (paginated)
 *
 * Returns orders with their items, including product variant and product info.
 * 20 orders per page, sorted by createdAt descending.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/auth/partner';
import { db } from '@/lib/db/drizzle';
import { partnerOrders, partnerOrderItems, productVariants, products } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getPartnerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // Fetch orders with relational query
  const orders = await db.query.partnerOrders.findMany({
    where: eq(partnerOrders.partnerConfigId, session.partnerConfigId),
    orderBy: [desc(partnerOrders.createdAt)],
    limit: pageSize,
    offset,
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

  // Count total orders for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(partnerOrders)
    .where(eq(partnerOrders.partnerConfigId, session.partnerConfigId));

  const total = countResult[0]?.count ?? 0;

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      notes: order.notes,
      submittedBy: order.submittedBy,
      submittedAt: order.submittedAt,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
        productVariantId: item.productVariantId,
        productName: item.productVariant.product.nameEn,
        variantName: item.productVariant.nameEn,
        sizeMl: item.productVariant.sizeMl,
        weightGrams: item.productVariant.weightGrams,
        imageUrl: item.productVariant.product.imageUrl,
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}
