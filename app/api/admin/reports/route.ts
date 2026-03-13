/**
 * Reports API — DEPRECATED
 *
 * AIGG ist ein gemeinnuetziger Verein (Vereinsgesetz 2002).
 * Monatliches Financial Reporting mit Gewinnaufteilung wurde entfernt.
 * Studien-Reports werden ueber n8n generiert (study_reports Tabelle).
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Financial Reporting deaktiviert',
      reason: 'AIGG ist ein gemeinnuetziger Verein — kein Financial Reporting noetig.',
      hint: 'Studien-Reports werden automatisch via n8n generiert.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Financial Reporting deaktiviert',
      reason: 'AIGG ist ein gemeinnuetziger Verein — kein Financial Reporting noetig.',
    },
    { status: 410 }
  );
}
