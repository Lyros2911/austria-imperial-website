/**
 * Partner Price List API
 * GET /api/partner/price-list — Active B2B export prices for this partner
 *
 * Joins partnerPriceLists -> productVariants -> products
 * to return full product info alongside the B2B pricing.
 * Response shape matches the frontend PriceListItem interface.
 */

import { NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/auth/partner';
import { db } from '@/lib/db/drizzle';
import {
  partnerPriceLists,
  productVariants,
  products,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getPartnerSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const rows = await db
    .select({
      id: partnerPriceLists.id,
      productVariantId: partnerPriceLists.productVariantId,
      productName: products.nameEn,
      variantName: productVariants.nameEn,
      sizeMl: productVariants.sizeMl,
      weightGrams: productVariants.weightGrams,
      exportPriceCents: partnerPriceLists.exportPriceCents,
      currency: partnerPriceLists.currency,
      minOrderQuantity: partnerPriceLists.minOrderQuantity,
      validFrom: partnerPriceLists.validFrom,
      validUntil: partnerPriceLists.validUntil,
      imageUrl: products.imageUrl,
    })
    .from(partnerPriceLists)
    .innerJoin(
      productVariants,
      eq(partnerPriceLists.productVariantId, productVariants.id),
    )
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(partnerPriceLists.partnerConfigId, session.partnerConfigId),
        eq(partnerPriceLists.active, true),
      ),
    );

  // Transform to match frontend PriceListItem interface
  const items = rows.map((row) => {
    let variant: string | null = null;
    if (row.sizeMl) variant = `${row.sizeMl}ml`;
    else if (row.weightGrams) variant = `${row.weightGrams}g`;
    else if (row.variantName) variant = row.variantName;

    return {
      id: row.id,
      productVariantId: row.productVariantId,
      productName: row.productName,
      variant,
      imageUrl: row.imageUrl,
      exportPriceCents: row.exportPriceCents,
      minOrderQty: row.minOrderQuantity,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
    };
  });

  return NextResponse.json({ items });
}
