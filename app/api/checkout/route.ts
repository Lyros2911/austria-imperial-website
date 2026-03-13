/**
 * @deprecated ENTFERNT — 2026-03-13
 *
 * Austria Imperial Green Gold ist seit Maerz 2026 ein gemeinnuetziger Verein.
 * Es gibt KEINEN Stripe Checkout.
 * Diese Datei wird beim naechsten Cleanup geloescht.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Checkout deaktiviert — gemeinnuetziger Verein' },
    { status: 410 }
  );
}
