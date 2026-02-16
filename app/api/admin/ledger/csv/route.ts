/**
 * Ledger CSV Export API
 *
 * GET /api/admin/ledger/csv?from=2026-01-01&to=2026-01-31
 *
 * Exports financial_ledger entries as CSV.
 * Protected by admin session check.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { financialLedger } from '@/lib/db/schema';
import { gte, lte, and, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Auth check
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const conditions = [];
  if (from) conditions.push(gte(financialLedger.createdAt, new Date(from)));
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(financialLedger.createdAt, toDate));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const entries = await db.query.financialLedger.findMany({
    where,
    orderBy: (l, { asc: a }) => [a(l.createdAt)],
    with: {
      order: true,
    },
  });

  // Build CSV
  const header = [
    'Date',
    'Order ID',
    'Order Number',
    'Entry Type',
    'Revenue (EUR)',
    'Producer Cost (EUR)',
    'Packaging (EUR)',
    'Shipping (EUR)',
    'Payment Fee (EUR)',
    'Customs (EUR)',
    'Gross Profit (EUR)',
    'Peter Share (EUR)',
    'AIGG Share (EUR)',
    'Notes',
  ].join(',');

  const rows = entries.map((e) =>
    [
      new Date(e.createdAt).toISOString().split('T')[0],
      e.orderId,
      `"${e.order.orderNumber}"`,
      e.entryType,
      (e.revenueCents / 100).toFixed(2),
      (e.producerCostCents / 100).toFixed(2),
      (e.packagingCents / 100).toFixed(2),
      (e.shippingCostCents / 100).toFixed(2),
      (e.paymentFeeCents / 100).toFixed(2),
      (e.customsCents / 100).toFixed(2),
      (e.grossProfitCents / 100).toFixed(2),
      (e.peterShareCents / 100).toFixed(2),
      (e.aiggShareCents / 100).toFixed(2),
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ].join(',')
  );

  const csv = [header, ...rows].join('\n');

  const filename = `aigg-ledger${from ? `-from-${from}` : ''}${to ? `-to-${to}` : ''}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
