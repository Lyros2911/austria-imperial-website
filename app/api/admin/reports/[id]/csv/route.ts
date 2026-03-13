/**
 * Report CSV Download — DEPRECATED
 *
 * AIGG ist ein gemeinnuetziger Verein (Vereinsgesetz 2002).
 * CSV-Downloads fuer Gewinnaufteilung wurden entfernt.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'CSV-Report deaktiviert',
      reason: 'AIGG ist ein gemeinnuetziger Verein — Financial CSV Reports entfernt.',
    },
    { status: 410 }
  );
}
