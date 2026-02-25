/**
 * Reports List API
 *
 * GET /api/admin/reports/list
 *
 * Returns all monthly reports, newest first.
 */

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { monthlyReports } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const reports = await db.query.monthlyReports.findMany({
    orderBy: (r, { desc: d }) => [d(r.year), d(r.month), d(r.generatedAt)],
  });

  return NextResponse.json({ reports });
}
