/**
 * Checkout API — Creates a Stripe Checkout Session (mode: 'payment')
 *
 * Receives cart items, looks up variants from DB,
 * creates a Stripe Checkout Session with line_items,
 * and returns the session URL for redirect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { db } from '@/lib/db/drizzle';
import { productVariants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { ATTRIBUTION_COOKIE, parseAttributionCookie } from '@/lib/attribution';

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        quantity: z.number().int().positive().max(20),
      })
    )
    .min(1)
    .max(20),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { items } = parsed.data;

    // Look up all variants
    const variantIds = items.map((i) => i.variantId);
    const variants = await db.query.productVariants.findMany({
      where: (pv, { inArray }) => inArray(pv.id, variantIds),
      with: { product: true },
    });

    if (variants.length !== variantIds.length) {
      return NextResponse.json(
        { error: 'Ein oder mehrere Produkte wurden nicht gefunden.' },
        { status: 400 }
      );
    }

    // Build Stripe line items — use stored price IDs when available, fall back to price_data
    const lineItems = items.map((item) => {
      const variant = variants.find((v) => v.id === item.variantId)!;

      // Prefer stored Stripe Price ID (faster, consistent Stripe Dashboard)
      if (variant.stripePriceId) {
        return {
          price: variant.stripePriceId,
          quantity: item.quantity,
        };
      }

      // Fallback: inline price_data
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${variant.product.nameDe} — ${variant.nameDe}`,
            description: variant.product.descriptionDe ?? undefined,
            metadata: {
              aigg_variant_id: String(variant.id),
              sku: variant.sku,
              producer: variant.product.producer,
            },
          },
          unit_amount: variant.priceCents,
        },
        quantity: item.quantity,
      };
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    // ─── Attribution aus Cookie lesen ────────────────
    const cookieHeader = request.headers.get('cookie') || '';
    const attrMatch = cookieHeader.match(new RegExp(`${ATTRIBUTION_COOKIE}=([^;]+)`));
    const attribution = parseAttributionCookie(
      attrMatch ? decodeURIComponent(attrMatch[1]) : undefined
    );

    // Create Stripe Checkout Session (mode: 'payment' — one-time)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'sepa_debit'],
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: [
          'AT', 'DE', 'CH', 'IT', 'NL', 'BE', 'LU', 'FR',
          'CZ', 'SK', 'HU', 'SI', 'HR', 'PL', 'DK', 'SE',
        ],
      },
      billing_address_collection: 'required',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      locale: 'de',
      metadata: {
        source: attribution?.source || 'direct',
        utm_source: attribution?.utm_source || '',
        utm_medium: attribution?.utm_medium || '',
        utm_campaign: attribution?.utm_campaign || '',
        utm_content: attribution?.utm_content || '',
        referrer: attribution?.referrer || '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Checkout API] Error:', message);
    return NextResponse.json({ error: 'Checkout fehlgeschlagen' }, { status: 500 });
  }
}
