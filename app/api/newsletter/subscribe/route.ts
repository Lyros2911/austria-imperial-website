import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { newsletterSubscribers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, locale = 'de', source = 'website' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Check existing
    const existing = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, trimmed))
      .limit(1);

    if (existing.length > 0) {
      const sub = existing[0];
      if (sub.isActive) {
        return NextResponse.json({ error: 'already_subscribed' }, { status: 409 });
      }
      // Re-activate
      await db
        .update(newsletterSubscribers)
        .set({ isActive: true, unsubscribedAt: null, locale, source })
        .where(eq(newsletterSubscribers.email, trimmed));
      return NextResponse.json({ ok: true, reactivated: true });
    }

    await db.insert(newsletterSubscribers).values({
      email: trimmed,
      locale,
      source,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
