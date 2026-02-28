/**
 * Partner Documents API
 * GET /api/partner/documents — List documents for this partner
 *
 * Returns customs papers, certificates, invoices etc.
 * uploaded by admin and visible in the partner portal.
 * storagePath is intentionally excluded from the response.
 * Response shape matches the frontend PartnerDocument interface.
 */

import { NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/auth/partner';
import { db } from '@/lib/db/drizzle';
import { partnerDocuments } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getPartnerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const rows = await db
    .select({
      id: partnerDocuments.id,
      title: partnerDocuments.title,
      category: partnerDocuments.category,
      fileName: partnerDocuments.fileName,
      fileSize: partnerDocuments.fileSize,
      mimeType: partnerDocuments.mimeType,
      uploadedBy: partnerDocuments.uploadedBy,
      createdAt: partnerDocuments.createdAt,
    })
    .from(partnerDocuments)
    .where(eq(partnerDocuments.partnerConfigId, session.partnerConfigId))
    .orderBy(desc(partnerDocuments.createdAt));

  // Transform to match frontend PartnerDocument interface
  const documents = rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    fileSizeBytes: row.fileSize ?? 0,
    uploadedAt: row.createdAt,
    uploadedBy: row.uploadedBy,
  }));

  return NextResponse.json({ documents });
}
