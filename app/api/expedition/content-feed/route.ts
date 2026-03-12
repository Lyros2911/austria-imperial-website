/**
 * GET /api/expedition/content-feed
 *
 * Content Feed API: Neueste Expedition-Content-Einträge
 * Für Homepage-Widget und Blog-Feed
 * Datenquelle: Airtable Content_Log
 *
 * Query params:
 *   ?limit=10 (default: 10, max: 50)
 *   ?platform=Instagram (optional filter)
 *
 * Response:
 * {
 *   items: [{ datum, plattform, typ, sprache, land, reichweite, engagement, link }],
 *   total: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { listRecords } from '@/lib/airtable/client';

interface ContentLogFields {
  Datum: string;
  Plattform: string;
  Typ: string;
  Sprache: string;
  Land_Bezug: string;
  Sponsor_Erwaehnung: string;
  Reichweite: number;
  Engagement: number;
  Link: string;
}

const CACHE_SECONDS = 600; // 10 Minuten

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const platform = searchParams.get('platform');

    const filter = platform
      ? `{Plattform} = '${platform.replace(/'/g, "\\'")}'`
      : undefined;

    const result = await listRecords<ContentLogFields>('Content_Log', {
      filterByFormula: filter,
      sort: [{ field: 'Datum', direction: 'desc' }],
      maxRecords: limit,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: 'Content-Daten konnten nicht geladen werden.' },
        { status: 502 }
      );
    }

    const items = result.data.map((r) => ({
      id: r.id,
      datum: r.fields.Datum,
      plattform: r.fields.Plattform,
      typ: r.fields.Typ,
      sprache: r.fields.Sprache,
      land: r.fields.Land_Bezug,
      sponsor: r.fields.Sponsor_Erwaehnung || null,
      reichweite: r.fields.Reichweite || 0,
      engagement: r.fields.Engagement || 0,
      link: r.fields.Link || null,
    }));

    return NextResponse.json(
      {
        items,
        total: items.length,
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
        },
      }
    );
  } catch (error) {
    console.error('[expedition/content-feed] Error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler.' },
      { status: 500 }
    );
  }
}
