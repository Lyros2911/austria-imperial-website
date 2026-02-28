export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { products, productVariants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ProductCard } from '@/components/products/product-card';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.products' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'products' });

  const allProducts = await db.query.products.findMany({
    where: eq(products.isActive, true),
    with: {
      variants: {
        where: eq(productVariants.isActive, true),
        orderBy: (v, { asc }) => [asc(v.priceCents)],
      },
    },
  });

  const menschenProdukte = allProducts.filter(
    (p) => p.category === 'kernoel' || p.category === 'kren'
  );
  const tierProdukte = allProducts.filter(
    (p) => p.category === 'tiernahrung'
  );

  return (
    <div className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4 animate-fade-in-up">
            {t('collection')}
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl text-cream font-semibold animate-fade-in-up delay-1">
            {t('title')}
          </h1>
          <p className="text-muted text-base max-w-xl mx-auto mt-6 leading-relaxed animate-fade-in-up delay-2">
            {t('subtitle')}
          </p>
        </div>

        {/* ── Für Menschen ── */}
        {menschenProdukte.length > 0 && (
          <section className="mb-20">
            <div className="mb-10">
              <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl text-cream font-semibold mb-3">
                {t('forHumans')}
              </h2>
              <p className="text-muted text-sm max-w-2xl leading-relaxed">
                {t('forHumansDesc')}
              </p>
              <div className="w-16 h-px bg-gold/30 mt-6" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
              {menschenProdukte.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* ── Für Tiere ── */}
        {tierProdukte.length > 0 && (
          <section>
            <div className="mb-10">
              <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl text-cream font-semibold mb-3">
                {t('forAnimals')}
              </h2>
              <p className="text-muted text-sm max-w-2xl leading-relaxed">
                {t('forAnimalsDesc')}
              </p>
              <div className="w-16 h-px bg-gold/30 mt-6" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
              {tierProdukte.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
