/**
 * GET /api/expedition/tracker
 *
 * Live-Expedition-Tracker: Aktueller Standort + besuchte Länder
 * Datenquelle: Airtable Expedition_Laender
 *
 * Response:
 * {
 *   current: { land, phase, gps_lat, gps_lon } | null,
 *   visited: [{ land, iso_code, phase, ankunft, abreise }],
 *   stats: { total_countries, current_phase }
 * }
 */

import { NextResponse } from 'next/server';
import { listRecords } from '@/lib/airtable/client';

interface ExpeditionLaenderFields {
  Land: string;
  ISO_Code: string;
  Phase: string;
  Ankunft: string;
  Abreise: string;
  Sprachen: string;
  GPS_Lat: number;
  GPS_Lon: number;
  Aktiv: boolean;
}

// Cache: 5 Minuten (CDN + Browser)
const CACHE_SECONDS = 300;

export async function GET() {
  try {
    const result = await listRecords<ExpeditionLaenderFields>('Expedition_Laender', {
      sort: [{ field: 'Ankunft', direction: 'desc' }],
      maxRecords: 100,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: 'Daten konnten nicht geladen werden.' },
        { status: 502 }
      );
    }

    const records = result.data;

    // Aktives Land
    const activeRecord = records.find((r) => r.fields.Aktiv);
    const current = activeRecord
      ? {
          land: activeRecord.fields.Land,
          iso_code: activeRecord.fields.ISO_Code,
          phase: activeRecord.fields.Phase,
          gps_lat: activeRecord.fields.GPS_Lat,
          gps_lon: activeRecord.fields.GPS_Lon,
          sprachen: activeRecord.fields.Sprachen,
        }
      : null;

    // Besuchte Länder
    const visited = records
      .filter((r) => r.fields.Ankunft)
      .map((r) => ({
        land: r.fields.Land,
        iso_code: r.fields.ISO_Code,
        phase: r.fields.Phase,
        ankunft: r.fields.Ankunft,
        abreise: r.fields.Abreise || null,
      }));

    // Statistiken
    const uniqueCountries = new Set(records.map((r) => r.fields.Land)).size;
    const currentPhase = activeRecord?.fields.Phase || null;

    return NextResponse.json(
      {
        current,
        visited,
        stats: {
          total_countries: uniqueCountries,
          current_phase: currentPhase,
        },
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
        },
      }
    );
  } catch (error) {
    console.error('[expedition/tracker] Error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler.' },
      { status: 500 }
    );
  }
}
