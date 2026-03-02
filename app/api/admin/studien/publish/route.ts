/**
 * POST /api/admin/studien/publish
 *
 * Veröffentlicht einen Studienbericht (draft → published).
 * Nur Admin-Session.
 *
 * Body: { reportId: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { studyReports, auditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/auth/admin';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    const [report] = await db
      .select()
      .from(studyReports)
      .where(eq(studyReports.id, parseInt(reportId)));

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.status === 'published') {
      return NextResponse.json({ error: 'Report already published' }, { status: 400 });
    }

    const [updated] = await db
      .update(studyReports)
      .set({
        status: 'published',
        publishedAt: new Date(),
      })
      .where(eq(studyReports.id, parseInt(reportId)))
      .returning();

    await db.insert(auditLog).values({
      action: 'study_published',
      entityType: 'study_reports',
      entityId: updated.id,
      performedBy: session.email,
      newValues: { reportId: updated.reportId, status: 'published' },
    });

    return NextResponse.json({
      success: true,
      report: updated,
    });
  } catch (error: any) {
    console.error('Failed to publish report:', error);
    return NextResponse.json(
      { error: 'Failed to publish', details: error.message },
      { status: 500 }
    );
  }
}
