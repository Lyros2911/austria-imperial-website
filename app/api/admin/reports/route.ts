/**
 * Reports API
 *
 * POST /api/admin/reports — Generate a report for a given month
 * Body: { year: number, month: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { generateMonthlyReport } from '@/lib/reporting/generate-report';
import { z } from 'zod';

const generateSchema = z.object({
  year: z.number().int().min(2024).max(2030),
  month: z.number().int().min(1).max(12),
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { year, month } = parsed.data;

    const result = await generateMonthlyReport(year, month, session.email);

    return NextResponse.json({
      success: true,
      reportId: result.reportId,
      hash: result.hash,
      year,
      month,
      entriesCount: result.data.ledgerEntriesCount,
      revenue: result.data.totalRevenueCents,
      grossProfit: result.data.totalGrossProfitCents,
    });
  } catch (err) {
    console.error('[Reports API] Error:', err);
    return NextResponse.json(
      { error: 'Report-Generierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
