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
    const [
      revenueResult,
      orderCountResult,
      topContentResult,
      platformBreakdown,
      contentBreakdown,
      languageBreakdown,
    ] = await Promise.all([
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

      // Attribution: Revenue per platform (utm_source)
      db
        .select({
          platform: sql<string>`COALESCE(${orders.utmSource}, ${orders.attributionSource}, 'direct')`,
          orderCount: sql<number>`count(*)::int`,
          revenueCents: sql<number>`COALESCE(SUM(${orders.totalCents}), 0)::int`,
          avgOrderCents: sql<number>`COALESCE(AVG(${orders.totalCents}), 0)::int`,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
        .groupBy(sql`COALESCE(${orders.utmSource}, ${orders.attributionSource}, 'direct')`)
        .orderBy(sql`SUM(${orders.totalCents}) DESC`),

      // Attribution: Revenue per content piece (utm_content = output_id from engine)
      db
        .select({
          contentId: orders.utmContent,
          campaign: orders.utmCampaign,
          platform: sql<string>`COALESCE(${orders.utmSource}, ${orders.attributionSource}, 'direct')`,
          orderCount: sql<number>`count(*)::int`,
          revenueCents: sql<number>`COALESCE(SUM(${orders.totalCents}), 0)::int`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, from),
            lte(orders.createdAt, to),
            sql`${orders.utmContent} IS NOT NULL`
          )
        )
        .groupBy(orders.utmContent, orders.utmCampaign, sql`COALESCE(${orders.utmSource}, ${orders.attributionSource}, 'direct')`)
        .orderBy(sql`SUM(${orders.totalCents}) DESC`)
        .limit(50),

      // Language breakdown (locale → DE/EN/AR/etc.)
      db
        .select({
          locale: orders.locale,
          orderCount: sql<number>`count(*)::int`,
          revenueCents: sql<number>`COALESCE(SUM(${orders.totalCents}), 0)::int`,
          avgOrderCents: sql<number>`COALESCE(AVG(${orders.totalCents}), 0)::int`,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
        .groupBy(orders.locale)
        .orderBy(sql`SUM(${orders.totalCents}) DESC`),
    ]);

    const revenue = revenueResult[0]?.revenue ?? 0;
    const orderCount = orderCountResult[0]?.count ?? 0;
    const avgOrderValue = orderCountResult[0]?.avgValue ?? 0;
    const topContent = topContentResult[0]?.productName ?? null;

    // Build contentMetrics: platform performance + individual content pieces
    const contentMetrics = {
      byPlatform: platformBreakdown.map((row) => ({
        platform: row.platform,
        orders: row.orderCount,
        revenueCents: row.revenueCents,
        avgOrderCents: row.avgOrderCents,
        revenueShare: revenue > 0 ? Math.round((row.revenueCents / revenue) * 10000) / 100 : 0,
      })),
      byContent: contentBreakdown.map((row) => ({
        contentId: row.contentId,
        campaign: row.campaign,
        platform: row.platform,
        orders: row.orderCount,
        revenueCents: row.revenueCents,
      })),
      auryxEngineOrders: platformBreakdown
        .filter((row) => row.platform !== 'direct')
        .reduce((sum, row) => sum + row.orderCount, 0),
      auryxEngineRevenue: platformBreakdown
        .filter((row) => row.platform !== 'direct')
        .reduce((sum, row) => sum + row.revenueCents, 0),
      directOrders: platformBreakdown.find((row) => row.platform === 'direct')?.orderCount ?? 0,
      directRevenue: platformBreakdown.find((row) => row.platform === 'direct')?.revenueCents ?? 0,
    };

    // Build dataByLanguage: { de: {...}, en: {...}, ar: {...} }
    const dataByLanguage: Record<string, object> = {};
    for (const row of languageBreakdown) {
      dataByLanguage[row.locale] = {
        orders: row.orderCount,
        revenueCents: row.revenueCents,
        avgOrderCents: row.avgOrderCents,
        revenueShare: revenue > 0 ? Math.round((row.revenueCents / revenue) * 10000) / 100 : 0,
      };
    }

    // Build dataByMarket: group locales into market regions
    const marketMapping: Record<string, string> = {
      de: 'dach', en: 'english', ar: 'arabic',
      fr: 'french', it: 'italian', es: 'spanish',
      tr: 'turkish', ru: 'russian',
    };
    const dataByMarket: Record<string, { orders: number; revenueCents: number; avgOrderCents: number; revenueShare: number }> = {};
    for (const row of languageBreakdown) {
      const market = marketMapping[row.locale] ?? 'other';
      if (!dataByMarket[market]) {
        dataByMarket[market] = { orders: 0, revenueCents: 0, avgOrderCents: 0, revenueShare: 0 };
      }
      dataByMarket[market].orders += row.orderCount;
      dataByMarket[market].revenueCents += row.revenueCents;
    }
    // Compute avg + share per market
    for (const market of Object.keys(dataByMarket)) {
      const m = dataByMarket[market];
      m.avgOrderCents = m.orders > 0 ? Math.round(m.revenueCents / m.orders) : 0;
      m.revenueShare = revenue > 0 ? Math.round((m.revenueCents / revenue) * 10000) / 100 : 0;
    }

    // Generate AI summary with attribution insights
    const periodLabel = `${from.toLocaleDateString('de-AT')} – ${to.toLocaleDateString('de-AT')}`;
    const typeLabel = type === 'weekly' ? 'Wochenbericht' : type === 'monthly' ? 'Monatsbericht' : type === 'quarterly' ? 'Quartalsbericht' : 'Jahresbericht';
    const topPlatform = platformBreakdown.find((p) => p.platform !== 'direct');
    const aiSummary = [
      `${typeLabel} für den Zeitraum ${periodLabel}.`,
      orderCount > 0
        ? `Es wurden ${orderCount} Bestellungen mit einem Gesamtumsatz von €${(revenue / 100).toFixed(2)} verarbeitet.`
        : 'In diesem Zeitraum wurden keine Bestellungen verzeichnet.',
      avgOrderValue > 0
        ? `Der durchschnittliche Bestellwert lag bei €${(avgOrderValue / 100).toFixed(2)}.`
        : '',
      topContent ? `Das meistverkaufte Produkt war: ${topContent}.` : '',
      contentMetrics.auryxEngineOrders > 0
        ? `Über die Auryx Content Engine kamen ${contentMetrics.auryxEngineOrders} Bestellungen (€${(contentMetrics.auryxEngineRevenue / 100).toFixed(2)}).`
        : '',
      topPlatform
        ? `Stärkste Plattform: ${topPlatform.platform} mit ${topPlatform.orderCount} Bestellungen (€${(topPlatform.revenueCents / 100).toFixed(2)}).`
        : '',
      Object.keys(dataByLanguage).length > 1
        ? `Bestellungen in ${Object.keys(dataByLanguage).length} Sprachen: ${Object.keys(dataByLanguage).join(', ').toUpperCase()}.`
        : '',
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
        dataByLanguage,
        dataByMarket,
        contentMetrics,
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
