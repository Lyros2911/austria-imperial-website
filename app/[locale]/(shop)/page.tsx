export const dynamic = 'force-dynamic';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { db } from '@/lib/db/drizzle';
import { products, productVariants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ProductCard } from '@/components/products/product-card';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'hero' });
  const tHome = await getTranslations({ locale, namespace: 'home' });

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
    <div>
      {/* ═══ Hero ═══ */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--aigg-black)] via-[#0d0c09] to-[var(--aigg-black)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(197,165,90,0.06)_0%,transparent_70%)]" />

        <div className="absolute top-1/4 left-0 right-0 gold-line opacity-20" />
        <div className="absolute bottom-1/3 left-0 right-0 gold-line opacity-10" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <p className="text-gold/60 text-xs tracking-[0.4em] uppercase mb-8 animate-fade-in-up">
              {t('tagline')}
            </p>

            <h1 className="font-[var(--font-heading)] text-5xl sm:text-6xl md:text-7xl lg:text-7xl font-semibold text-cream leading-[1.05] mb-6 animate-fade-in-up delay-1">
              <span className="text-gold-shimmer">{t('heading1')}</span>
              <br />
              {t('heading2')}
            </h1>

            <p className="text-muted text-base sm:text-lg max-w-2xl leading-relaxed mb-12 animate-fade-in-up delay-2">
              {t('subheading')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up delay-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center bg-gold hover:bg-gold-light text-[var(--aigg-black)] font-semibold text-sm tracking-wide px-10 py-4 rounded transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,165,90,0.2)]"
              >
                {t('ctaProducts')}
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center border border-border-gold text-cream/70 hover:text-gold hover:border-gold/40 text-sm tracking-wide px-10 py-4 rounded transition-all duration-300"
              >
                {t('ctaStory')}
              </Link>
            </div>
          </div>

          <div className="relative animate-fade-in-up delay-2 hidden lg:block">
            <div className="relative rounded-lg overflow-hidden border border-border-gold/30 shadow-[0_0_60px_rgba(197,165,90,0.08)]">
              <Image
                src="/images/kernoel-flaschen.jpg"
                alt={t('imageAlt')}
                width={1600}
                height={1204}
                className="w-full h-auto object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--aigg-black)]/30 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-fade-in delay-5">
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-gold/30 to-transparent" />
        </div>
      </section>

      {/* ═══ Products Preview ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {tHome('specialties')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold">
              {tHome('premiumProducts')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {allProducts.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Trust Banner ═══ */}
      <section className="py-20 border-t border-b border-border-gold">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
            <TrustItem
              title={tHome('trust.ggaCertified.title')}
              description={tHome('trust.ggaCertified.description')}
            />
            <TrustItem
              title={tHome('trust.directProducer.title')}
              description={tHome('trust.directProducer.description')}
            />
            <TrustItem
              title={tHome('trust.securePayment.title')}
              description={tHome('trust.securePayment.description')}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-3">
      <h3 className="text-cream font-[var(--font-heading)] text-lg">{title}</h3>
      <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto">{description}</p>
    </div>
  );
}
