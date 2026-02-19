export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { products, productVariants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ProductCard } from '@/components/products/product-card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Produkte',
  description: 'Steirisches Kürbiskernöl g.g.A. und Steirischer Kren — unsere Premium-Spezialitäten.',
};

export default async function ProductsPage() {
  const allProducts = await db.query.products.findMany({
    where: eq(products.isActive, true),
    with: {
      variants: {
        where: eq(productVariants.isActive, true),
        orderBy: (v, { asc }) => [asc(v.priceCents)],
      },
    },
  });

  return (
    <div className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4 animate-fade-in-up">
            Kollektion
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl text-cream font-semibold animate-fade-in-up delay-1">
            Unsere Produkte
          </h1>
          <p className="text-muted text-base max-w-xl mx-auto mt-6 leading-relaxed animate-fade-in-up delay-2">
            Sorgfältig ausgewählte österreichische Spezialitäten — von traditionellen
            Erzeugern in der Steiermark hergestellt.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {allProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
