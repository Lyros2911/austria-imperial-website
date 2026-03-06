import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { newsletterSubscribers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }

  const trimmed = email.trim().toLowerCase();

  await db
    .update(newsletterSubscribers)
    .set({ isActive: false, unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.email, trimmed));

  return NextResponse.json({ ok: true, message: 'Unsubscribed successfully' });
}
