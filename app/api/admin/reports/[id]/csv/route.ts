/**
 * Report CSV Download
 *
 * GET /api/admin/reports/[id]/csv?type=summary|detailed
 *
 * Regenerates CSV from ledger data for the report's period.
 * This ensures the CSV always matches the ledger (append-only, no tampering).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { monthlyReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  aggregateMonthlyData,
  generateDetailedCSV,
  generateSummaryCSV,
  computeReportHash,
} from '@/lib/reporting/generate-report';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'detailed';

  // Find report
  const report = await db.query.monthlyReports.findFirst({
    where: eq(monthlyReports.id, id),
  });

  if (!report) {
    return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
  }

  // Re-aggregate from ledger (source of truth)
  const data = await aggregateMonthlyData(report.year, report.month);

  let csv: string;
  let filename: string;

  if (type === 'summary') {
    csv = generateSummaryCSV(data, report.reportHash, report.generatedAt);
    filename = `aigg-report-${report.year}-${String(report.month).padStart(2, '0')}-summary.csv`;
  } else {
    csv = generateDetailedCSV(data);
    filename = `aigg-ledger-${report.year}-${String(report.month).padStart(2, '0')}-detailed.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
