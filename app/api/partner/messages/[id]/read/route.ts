/**
 * Mark Partner Message as Read
 * POST /api/partner/messages/[id]/read
 *
 * Sets readAt timestamp on the message.
 * Only marks if readAt is currently null (idempotent, no overwrite).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/auth/partner';
import { db } from '@/lib/db/drizzle';
import { partnerMessages } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPartnerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const { id } = await params;
  const messageId = parseInt(id);
  if (isNaN(messageId)) {
    return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
  }

  // Only update if readAt is null and message belongs to this partner
  const result = await db
    .update(partnerMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(partnerMessages.id, messageId),
        eq(partnerMessages.partnerConfigId, session.partnerConfigId),
        isNull(partnerMessages.readAt),
      ),
    )
    .returning({ id: partnerMessages.id, readAt: partnerMessages.readAt });

  if (result.length === 0) {
    // Either message doesn't exist, doesn't belong to this partner,
    // or was already marked as read
    const existing = await db.query.partnerMessages.findFirst({
      where: and(
        eq(partnerMessages.id, messageId),
        eq(partnerMessages.partnerConfigId, session.partnerConfigId),
      ),
      columns: { id: true, readAt: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Already read — return success (idempotent)
    return NextResponse.json({ success: true, readAt: existing.readAt });
  }

  return NextResponse.json({ success: true, readAt: result[0].readAt });
}
