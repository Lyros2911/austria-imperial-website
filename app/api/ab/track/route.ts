/**
 * A/B Test Event Tracking API
 *
 * POST /api/ab/track
 * Empfaengt anonyme Tracking-Events und speichert sie in ab_events.
 * Kein Auth noetig (oeffentlicher Endpoint, aber durch Zod-Validierung geschuetzt).
 *
 * Gibt IMMER 200 zurueck — Client soll keine Retries machen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { abEvents, abExperiments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const trackSchema = z.object({
  experimentSlug: z.string().max(50),
  visitorId: z.string().uuid(),
  variant: z.enum(['A', 'B']),
  eventType: z.enum([
    'page_view',
    'avatar_impression',
    'avatar_click',
    'add_to_cart',
    'checkout_start',
    'purchase',
  ]),
  productSlug: z.string().max(100).optional(),
  locale: z.string().max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = trackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ received: true, stored: false });
    }

    const {
      experimentSlug,
      visitorId,
      variant,
      eventType,
      productSlug,
      locale,
      metadata,
    } = parsed.data;

    // Experiment nachschlagen — nur aktive Experimente tracken
    const experiment = await db.query.abExperiments.findFirst({
      where: eq(abExperiments.slug, experimentSlug),
    });

    if (!experiment || experiment.status !== 'running') {
      return NextResponse.json({ received: true, stored: false });
    }

    // Event speichern
    await db.insert(abEvents).values({
      experimentId: experiment.id,
      visitorId,
      variant,
      eventType,
      productSlug: productSlug || null,
      locale: locale || null,
      metadata: metadata || null,
    });

    return NextResponse.json({ received: true, stored: true });
  } catch (err) {
    console.error(
      '[AB Track] Error:',
      err instanceof Error ? err.message : 'Unknown'
    );
    // Immer 200 zurueckgeben damit Client nicht retried
    return NextResponse.json({ received: true, stored: false });
  }
}
