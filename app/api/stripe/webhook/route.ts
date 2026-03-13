/**
 * @deprecated ENTFERNT — 2026-03-13
 *
 * Austria Imperial Green Gold ist seit Maerz 2026 ein gemeinnuetziger Verein.
 * Stripe Webhook fuer Orders/Fulfillment/Refunds ist deaktiviert.
 * Diese Datei wird beim naechsten Cleanup geloescht.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[Stripe Webhook] DEPRECATED — AIGG ist ein gemeinnuetziger Verein. Webhook deaktiviert.');
  return NextResponse.json(
    { error: 'Webhook deaktiviert — gemeinnuetziger Verein' },
    { status: 410 }
  );
}
