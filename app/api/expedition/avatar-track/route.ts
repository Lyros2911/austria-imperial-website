/**
 * POST /api/expedition/avatar-track
 *
 * Avatar-Kontakt-Tracking für A/B-Test
 * Wird vom Frontend aufgerufen wenn ein User mit Kerni oder
 * Scharfer Rudi interagiert.
 *
 * Body:
 * {
 *   avatar: "Kerni" | "Scharfer Rudi",
 *   page: string,           // z.B. "/de/kernoel"
 *   session_id: string,     // Browser Session ID
 *   action: string          // z.B. "click", "hover", "chat"
 * }
 *
 * Response:
 * { success: true, tracked: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRecord } from '@/lib/airtable/client';

interface AvatarTrackFields {
  Datum: string;
  Avatar_Variante: string;
  Kanal: string;
  Land_Kunde: string;
  Produkt: string;
  Conversion: boolean;
}

// Rate Limit: Max 100 Requests pro Minute pro IP
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }

  if (entry.count >= 100) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate Limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { avatar, page, session_id, action } = body;

    if (!avatar || !page || !session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: avatar, page, session_id' },
        { status: 400 }
      );
    }

    // Validierung: Nur bekannte Avatare
    const validAvatars = ['Kerni', 'Scharfer Rudi'];
    if (!validAvatars.includes(avatar)) {
      return NextResponse.json(
        { error: 'Invalid avatar. Must be "Kerni" or "Scharfer Rudi".' },
        { status: 400 }
      );
    }

    // Tracking-Record in Airtable erstellen
    const result = await createRecord<AvatarTrackFields>('Avatar_Sales_Tracking', {
      Datum: new Date().toISOString().split('T')[0],
      Avatar_Variante: avatar,
      Kanal: 'Website',
      Produkt: page,
      Land_Kunde: getCountryFromHeaders(request),
      Conversion: false, // Wird später via Stripe Webhook auf true gesetzt
    });

    if (!result.success) {
      console.error('[expedition/avatar-track] Airtable error:', result.error);
      // Trotzdem 200 zurückgeben — Tracking sollte niemals die UX blockieren
      return NextResponse.json({ success: true, tracked: false });
    }

    // Session-ID in Cookie für spätere Conversion-Zuordnung
    const response = NextResponse.json({
      success: true,
      tracked: true,
      record_id: result.data?.id,
    });

    // Avatar-Kontakt Cookie setzen (30 Tage)
    response.cookies.set('aigg_avatar_contact', JSON.stringify({
      avatar,
      record_id: result.data?.id,
      session_id,
      action: action || 'view',
      timestamp: Date.now(),
    }), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 Tage
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[expedition/avatar-track] Error:', error);
    // Trotzdem 200 — Tracking Fehler sollten nie sichtbar sein
    return NextResponse.json({ success: true, tracked: false });
  }
}

/**
 * Versucht das Land aus Cloudflare/Vercel/Traefik Headern zu lesen
 */
function getCountryFromHeaders(request: NextRequest): string {
  return (
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('x-country') ||
    'Unbekannt'
  );
}
