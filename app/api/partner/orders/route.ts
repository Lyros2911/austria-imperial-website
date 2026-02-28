/**
 * Partner Orders API
 * GET /api/partner/orders — List orders attributed to this partner
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/auth/partner';
import { db } from '@/lib/db/drizzle';
import { orders, partnerCommissions } from '@/lib/db/schema';
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

  // Get orders that have commissions for this partner
  const partnerOrders = await db.query.partnerCommissions.findMany({
    where: eq(partnerCommissions.partnerConfigId, session.partnerConfigId),
    orderBy: (pc, { desc: d }) => [d(pc.createdAt)],
    limit: pageSize,
    offset,
    with: {
      order: {
        with: {
          items: true,
          fulfillmentOrders: true,
        },
      },
    },
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(partnerCommissions)
    .where(eq(partnerCommissions.partnerConfigId, session.partnerConfigId));

  return NextResponse.json({
    orders: partnerOrders.map((pc) => ({
      id: pc.order.id,
      orderNumber: pc.order.orderNumber,
      status: pc.order.status,
      totalCents: pc.order.totalCents,
      currency: pc.order.currency,
      createdAt: pc.order.createdAt,
      itemCount: pc.order.items.length,
      fulfillments: pc.order.fulfillmentOrders.map((fo) => ({
        id: fo.id,
        status: fo.status,
        producer: fo.producer,
        trackingNumber: fo.trackingNumber,
        trackingUrl: fo.trackingUrl,
        shippedAt: fo.shippedAt,
        deliveredAt: fo.deliveredAt,
      })),
    })),
    total: countResult[0]?.count ?? 0,
    page,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / pageSize),
  });
}
