/**
 * Partner Messages API
 * GET  /api/partner/messages — List messages for this partner
 * POST /api/partner/messages — Send a new message from the partner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/auth/partner';
import { db } from '@/lib/db/drizzle';
import { partnerMessages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── GET: List all messages ─────────────────────

export async function GET() {
  const session = await getPartnerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const messages = await db
    .select({
      id: partnerMessages.id,
      senderType: partnerMessages.senderType,
      senderName: partnerMessages.senderName,
      subject: partnerMessages.subject,
      body: partnerMessages.body,
      readAt: partnerMessages.readAt,
      createdAt: partnerMessages.createdAt,
    })
    .from(partnerMessages)
    .where(eq(partnerMessages.partnerConfigId, session.partnerConfigId))
    .orderBy(desc(partnerMessages.createdAt));

  return NextResponse.json({ messages });
}

// ─── POST: Create new message from partner ──────

const createMessageSchema = z.object({
  subject: z.string().optional(),
  body: z.string().min(1, 'Message body is required'),
});

export async function POST(request: NextRequest) {
  const session = await getPartnerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [message] = await db
    .insert(partnerMessages)
    .values({
      partnerConfigId: session.partnerConfigId,
      senderType: 'partner',
      senderName: session.name || session.email,
      subject: parsed.data.subject || null,
      body: parsed.data.body,
    })
    .returning({
      id: partnerMessages.id,
      senderType: partnerMessages.senderType,
      senderName: partnerMessages.senderName,
      subject: partnerMessages.subject,
      body: partnerMessages.body,
      createdAt: partnerMessages.createdAt,
    });

  return NextResponse.json({ success: true, message }, { status: 201 });
}
