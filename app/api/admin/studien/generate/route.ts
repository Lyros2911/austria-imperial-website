/**
 * POST /api/admin/studien/generate
 *
 * Generiert einen Studienbericht für eine bestimmte Periode.
 * Wird von n8n-Workflows aufgerufen (Schedule-Trigger).
 *
 * Auth: Bearer Token (STUDIEN_API_KEY) ODER Admin-Session
 *
 * Body: { type: 'weekly'|'monthly'|'quarterly'|'yearly', periodFrom?: string, periodTo?: string }
 * Wenn periodFrom/periodTo nicht angegeben → automatisch letzte Woche/Monat/Quartal
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { studyReports, orders, financialLedger, orderItems, productVariants, products } from '@/lib/db/schema';
import { sql, gte, lte, and } from 'drizzle-orm';
import { getAdminSession } from '@/lib/auth/admin';

function checkApiKey(req: NextRequest): boolean {
  const apiKey = process.env.STUDIEN_API_KEY;
  if (!apiKey) return false;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === apiKey;
  }
  return false;
}

function getAutoPeriod(type: string): { from: Date; to: Date; reportId: string } {
  const now = new Date();

  switch (type) {
    case 'weekly': {
      // Letzte abgeschlossene Woche (Mo-So)
      const dayOfWeek = now.getDay(); // 0=So, 1=Mo, ...
      const lastSunday = new Date(now);
      lastSunday.setDate(now.getDate() - dayOfWeek);
      lastSunday.setHours(23, 59, 59, 999);

      const lastMonday = new Date(lastSunday);
      lastMonday.setDate(lastSunday.getDate() - 6);
      lastMonday.setHours(0, 0, 0, 0);

      // KW berechnen
      const startOfYear = new Date(lastMonday.getFullYear(), 0, 1);
      const diff = lastMonday.getTime() - startOfYear.getTime();
      const weekNum = Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);

      return {
        from: lastMonday,
        to: lastSunday,
        reportId: `WB-${lastMonday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`,
      };
    }
    case 'monthly': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        from: lastMonth,
        to: lastMonthEnd,
        reportId: `MB-${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`,
      };
    }
    case 'quarterly': {
      const currentQ = Math.floor(now.getMonth() / 3);
      const lastQ = currentQ === 0 ? 3 : currentQ - 1;
      const lastQYear = currentQ === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const qStart = new Date(lastQYear, lastQ * 3, 1);
      const qEnd = new Date(lastQYear, (lastQ + 1) * 3, 0, 23, 59, 59, 999);
      return {
        from: qStart,
        to: qEnd,
        reportId: `QB-${lastQYear}-Q${lastQ + 1}`,
      };
    }
    case 'yearly': {
      const lastYear = now.getFullYear() - 1;
      return {
        from: new Date(lastYear, 0, 1),
        to: new Date(lastYear, 11, 31, 23, 59, 59, 999),
        reportId: `JB-${lastYear}`,
      };
    }
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

export async function POST(req: NextRequest) {
  // Auth: API Key (for n8n) OR Admin session (for manual trigger)
  const isApiKeyValid = checkApiKey(req);
  const session = !isApiKeyValid ? await getAdminSession() : null;

  if (!isApiKeyValid && (!session || session.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, periodFrom, periodTo } = body;

    if (!type || !['weekly', 'monthly', 'quarterly', 'yearly'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: weekly, monthly, quarterly, yearly' },
        { status: 400 }
      );
    }

    // Determine period
    const autoPeriod = getAutoPeriod(type);
    const from = periodFrom ? new Date(periodFrom) : autoPeriod.from;
    const to = periodTo ? new Date(periodTo) : autoPeriod.to;
    const reportId = autoPeriod.reportId;

    // Check if report already exists
    const existing = await db
      .select({ id: studyReports.id })
      .from(studyReports)
      .where(sql`${studyReports.reportId} = ${reportId}`);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Report ${reportId} already exists`, reportId },
        { status: 409 }
      );
    }

    // Gather data from AIGG database
    const [revenueResult, orderCountResult, topContentResult] = await Promise.all([
      // Total revenue for period
      db
        .select({
          revenue: sql<number>`COALESCE(SUM(revenue_cents), 0)::int`,
          grossProfit: sql<number>`COALESCE(SUM(gross_profit_cents), 0)::int`,
          auryxShare: sql<number>`COALESCE(SUM(auryx_share_cents), 0)::int`,
        })
        .from(financialLedger)
        .where(and(gte(financialLedger.createdAt, from), lte(financialLedger.createdAt, to))),

      // Order count + avg value
      db
        .select({
          count: sql<number>`count(*)::int`,
          avgValue: sql<number>`COALESCE(AVG(total_cents), 0)::int`,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to))),

      // Top selling product (join order_items → product_variants → products)
      db
        .select({
          productName: products.nameDe,
          totalQty: sql<number>`SUM(${orderItems.quantity})::int`,
        })
        .from(orderItems)
        .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
        .innerJoin(productVariants, sql`${productVariants.id} = ${orderItems.productVariantId}`)
        .innerJoin(products, sql`${products.id} = ${productVariants.productId}`)
        .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
        .groupBy(products.nameDe)
        .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
        .limit(1),
    ]);

    const revenue = revenueResult[0]?.revenue ?? 0;
    const orderCount = orderCountResult[0]?.count ?? 0;
    const avgOrderValue = orderCountResult[0]?.avgValue ?? 0;
    const topContent = topContentResult[0]?.productName ?? null;

    // Generate AI summary (simple template, can be enhanced with Claude API later)
    const periodLabel = `${from.toLocaleDateString('de-AT')} – ${to.toLocaleDateString('de-AT')}`;
    const typeLabel = type === 'weekly' ? 'Wochenbericht' : type === 'monthly' ? 'Monatsbericht' : type === 'quarterly' ? 'Quartalsbericht' : 'Jahresbericht';
    const aiSummary = [
      `${typeLabel} für den Zeitraum ${periodLabel}.`,
      orderCount > 0
        ? `Es wurden ${orderCount} Bestellungen mit einem Gesamtumsatz von €${(revenue / 100).toFixed(2)} verarbeitet.`
        : 'In diesem Zeitraum wurden keine Bestellungen verzeichnet.',
      avgOrderValue > 0
        ? `Der durchschnittliche Bestellwert lag bei €${(avgOrderValue / 100).toFixed(2)}.`
        : '',
      topContent ? `Das meistverkaufte Produkt war: ${topContent}.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    // Insert report
    const [created] = await db
      .insert(studyReports)
      .values({
        reportId,
        type,
        periodFrom: from,
        periodTo: to,
        totalRevenue: revenue,
        orderCount,
        averageOrderValue: avgOrderValue,
        topContent,
        aiSummary,
        status: 'draft',
        dataByLanguage: null,
        dataByMarket: null,
        contentMetrics: null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      reportId: created.reportId,
      report: {
        id: created.id,
        reportId: created.reportId,
        type: created.type,
        periodFrom: created.periodFrom,
        periodTo: created.periodTo,
        revenue,
        orderCount,
        avgOrderValue,
        topContent,
        aiSummary,
      },
    });
  } catch (error: any) {
    console.error('Failed to generate study report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error.message },
      { status: 500 }
    );
  }
}
