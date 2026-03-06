/**
 * GET /api/admin/studien/[id]/export?format=csv|json
 *
 * Exportiert einen Studienbericht als CSV oder JSON.
 * Für die Expedition-Studie: Daten müssen auslesbar sein.
 *
 * Auth: Admin-Session ODER Bearer Token (STUDIEN_API_KEY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { studyReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

interface PlatformMetric {
  platform: string;
  orders: number;
  revenueCents: number;
  avgOrderCents: number;
  revenueShare: number;
}

interface ContentMetric {
  contentId: string | null;
  campaign: string | null;
  platform: string;
  orders: number;
  revenueCents: number;
}

interface ContentMetrics {
  byPlatform: PlatformMetric[];
  byContent: ContentMetric[];
  auryxEngineOrders: number;
  auryxEngineRevenue: number;
  directOrders: number;
  directRevenue: number;
}

interface LanguageData {
  orders: number;
  revenueCents: number;
  avgOrderCents: number;
  revenueShare: number;
}

function generateStudyCSV(report: typeof studyReports.$inferSelect): string {
  const lines: string[] = [];

  // Header section
  lines.push('AIGG Studienbericht — Export');
  lines.push(`Bericht-ID;${report.reportId}`);
  lines.push(`Typ;${report.type}`);
  lines.push(`Zeitraum;${new Date(report.periodFrom).toISOString().split('T')[0]};${new Date(report.periodTo).toISOString().split('T')[0]}`);
  lines.push(`Status;${report.status}`);
  lines.push(`Erstellt;${new Date(report.createdAt).toISOString()}`);
  lines.push('');

  // KPIs
  lines.push('=== KENNZAHLEN ===');
  lines.push('Metrik;Wert');
  lines.push(`Gesamtumsatz (Cent);${report.totalRevenue ?? 0}`);
  lines.push(`Gesamtumsatz (EUR);${((report.totalRevenue ?? 0) / 100).toFixed(2)}`);
  lines.push(`Bestellungen;${report.orderCount ?? 0}`);
  lines.push(`Ø Bestellwert (Cent);${report.averageOrderValue ?? 0}`);
  lines.push(`Ø Bestellwert (EUR);${((report.averageOrderValue ?? 0) / 100).toFixed(2)}`);
  lines.push(`Top-Produkt;${report.topContent ?? '-'}`);
  lines.push('');

  // Content Metrics — Platform Breakdown
  const metrics = report.contentMetrics as ContentMetrics | null;
  if (metrics?.byPlatform?.length) {
    lines.push('=== PLATTFORM-PERFORMANCE ===');
    lines.push('Plattform;Bestellungen;Umsatz (Cent);Umsatz (EUR);Ø Bestellwert (EUR);Anteil (%)');
    for (const p of metrics.byPlatform) {
      lines.push(
        `${p.platform};${p.orders};${p.revenueCents};${(p.revenueCents / 100).toFixed(2)};${(p.avgOrderCents / 100).toFixed(2)};${p.revenueShare}`
      );
    }
    lines.push('');

    // Auryx Engine vs Direct summary
    lines.push('=== AURYX ENGINE vs DIREKT ===');
    lines.push('Kanal;Bestellungen;Umsatz (EUR)');
    lines.push(`Auryx Content Engine;${metrics.auryxEngineOrders};${(metrics.auryxEngineRevenue / 100).toFixed(2)}`);
    lines.push(`Direktzugriff;${metrics.directOrders};${(metrics.directRevenue / 100).toFixed(2)}`);
    lines.push('');
  }

  // Content Metrics — Individual Content Pieces
  if (metrics?.byContent?.length) {
    lines.push('=== CONTENT-ATTRIBUTION ===');
    lines.push('Content-ID;Kampagne;Plattform;Bestellungen;Umsatz (EUR)');
    for (const c of metrics.byContent) {
      lines.push(
        `${c.contentId ?? '-'};${c.campaign ?? '-'};${c.platform};${c.orders};${(c.revenueCents / 100).toFixed(2)}`
      );
    }
    lines.push('');
  }

  // Language Breakdown
  const langData = report.dataByLanguage as Record<string, LanguageData> | null;
  if (langData && Object.keys(langData).length > 0) {
    lines.push('=== SPRACH-AUFSCHLÜSSELUNG ===');
    lines.push('Sprache;Bestellungen;Umsatz (EUR);Ø Bestellwert (EUR);Anteil (%)');
    for (const [lang, data] of Object.entries(langData)) {
      lines.push(
        `${lang.toUpperCase()};${data.orders};${(data.revenueCents / 100).toFixed(2)};${(data.avgOrderCents / 100).toFixed(2)};${data.revenueShare}`
      );
    }
    lines.push('');
  }

  // Market Breakdown
  const marketData = report.dataByMarket as Record<string, LanguageData> | null;
  if (marketData && Object.keys(marketData).length > 0) {
    lines.push('=== MARKT-AUFSCHLÜSSELUNG ===');
    lines.push('Markt;Bestellungen;Umsatz (EUR);Ø Bestellwert (EUR);Anteil (%)');
    for (const [market, data] of Object.entries(marketData)) {
      lines.push(
        `${market};${data.orders};${(data.revenueCents / 100).toFixed(2)};${(data.avgOrderCents / 100).toFixed(2)};${data.revenueShare}`
      );
    }
    lines.push('');
  }

  // AI Summary
  if (report.aiSummary) {
    lines.push('=== KI-ZUSAMMENFASSUNG ===');
    lines.push(report.aiSummary.replace(/;/g, ','));
  }

  return lines.join('\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isApiKeyValid = checkApiKey(request);
  const session = !isApiKeyValid ? await getAdminSession() : null;

  if (!isApiKeyValid && (!session || session.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  const [report] = await db
    .select()
    .from(studyReports)
    .where(eq(studyReports.id, parseInt(id)));

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if (format === 'csv') {
    const csv = generateStudyCSV(report);
    const filename = `aigg-studie-${report.reportId}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // JSON export — full report data for programmatic access
  return NextResponse.json({
    reportId: report.reportId,
    type: report.type,
    status: report.status,
    period: {
      from: report.periodFrom,
      to: report.periodTo,
    },
    kpis: {
      totalRevenueCents: report.totalRevenue,
      totalRevenueEur: report.totalRevenue != null ? (report.totalRevenue / 100).toFixed(2) : null,
      orderCount: report.orderCount,
      averageOrderValueCents: report.averageOrderValue,
      topContent: report.topContent,
    },
    contentMetrics: report.contentMetrics,
    dataByLanguage: report.dataByLanguage,
    dataByMarket: report.dataByMarket,
    aiSummary: report.aiSummary,
    createdAt: report.createdAt,
    publishedAt: report.publishedAt,
  });
}
