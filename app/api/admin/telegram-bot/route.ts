/**
 * API: Admin Telegram Bot Linking
 *
 * GET  → Status (connected, chatId)
 * POST → Save Chat-ID
 * DELETE → Remove Chat-ID (disconnect)
 */

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { adminUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// ─── GET: Bot-Verknüpfungs-Status ───────────────

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, session.userId),
    columns: { telegramChatId: true },
  });

  return NextResponse.json({
    connected: !!user?.telegramChatId,
    chatId: user?.telegramChatId ?? null,
  });
}

// ─── POST: Chat-ID speichern ────────────────────

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { chatId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const chatId = body.chatId?.trim();

  // Validate: only digits, max 20 chars
  if (!chatId || !/^\d{1,20}$/.test(chatId)) {
    return NextResponse.json(
      { error: 'Chat-ID muss eine Zahl sein (max. 20 Stellen)' },
      { status: 400 }
    );
  }

  await db
    .update(adminUsers)
    .set({ telegramChatId: chatId, updatedAt: new Date() })
    .where(eq(adminUsers.id, session.userId));

  return NextResponse.json({ connected: true, chatId });
}

// ─── DELETE: Chat-ID entfernen (trennen) ─────────

export async function DELETE() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db
    .update(adminUsers)
    .set({ telegramChatId: null, updatedAt: new Date() })
    .where(eq(adminUsers.id, session.userId));

  return NextResponse.json({ connected: false, chatId: null });
}
