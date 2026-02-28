export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { products, productVariants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { AddToCartSection } from '@/components/products/add-to-cart';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getLocalizedField } from '@/lib/i18n-helpers';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

const CATEGORY_IMAGES: Record<string, string> = {
  kernoel: '/images/kernoel-flaschen.jpg',
  kren: '/images/kren-produkte.jpg',
  tiernahrung: '/images/kren-produkte.jpg',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
  });

  const name = product
    ? getLocalizedField(product as unknown as Record<string, unknown>, 'name', locale)
    : 'Produkt';
  const desc = product
    ? getLocalizedField(product as unknown as Record<string, unknown>, 'description', locale)
    : undefined;

  return {
    title: name,
    description: desc,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'productDetail' });

  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      variants: {
        where: eq(productVariants.isActive, true),
        orderBy: (v, { asc }) => [asc(v.priceCents)],
      },
    },
  });

  if (!product) notFound();

  const isKernoel = product.category === 'kernoel';
  const hasVariants = product.variants.length > 0;
  const categoryLabel = t(`categories.${product.category}`);
  const imageSrc = CATEGORY_IMAGES[product.category] ?? '/images/kren-produkte.jpg';
  const producerName = t(`producers.${product.producer}`);
  const productName = getLocalizedField(product as unknown as Record<string, unknown>, 'name', locale);
  const productDesc = getLocalizedField(product as unknown as Record<string, unknown>, 'description', locale);

  return (
    <div className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Image area */}
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <Image
              src={imageSrc}
              alt={productName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {isKernoel && (
              <div className="absolute top-6 left-6 z-10">
                <span className="text-gold/80 text-[10px] tracking-[0.3em] uppercase bg-[var(--aigg-black)]/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-border-gold">
                  {t('ggaBadge')}
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {categoryLabel}
            </p>

            <h1 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-6">
              {productName}
            </h1>

            <p className="text-muted text-base leading-relaxed mb-10">
              {productDesc}
            </p>

            {hasVariants ? (
              <AddToCartSection
                product={{
                  id: product.id,
                  slug: product.slug,
                  nameDe: product.nameDe,
                  producer: product.producer,
                }}
                variants={product.variants.map((v) => ({
                  id: v.id,
                  sku: v.sku,
                  nameDe: v.nameDe,
                  priceCents: v.priceCents,
                  sizeMl: v.sizeMl,
                }))}
              />
            ) : (
              <div className="bg-surface border border-border rounded-lg p-6 space-y-3">
                <p className="text-gold/80 font-[var(--font-heading)] text-lg font-semibold">
                  {t('comingSoon.title')}
                </p>
                <p className="text-muted text-sm leading-relaxed">
                  {t('comingSoon.description')}
                </p>
              </div>
            )}

            {/* Details */}
            <div className="mt-12 pt-8 border-t border-border space-y-4">
              <DetailRow label={t('origin')} value={t('originValue')} />
              <DetailRow label={t('producer')} value={producerName} />
              {isKernoel && <DetailRow label={t('certification')} value={t('certificationValue')} />}
              {product.category === 'tiernahrung' && (
                <DetailRow
                  label={t('targetAudience')}
                  value={product.slug.includes('pferde') ? t('horses') : t('camels')}
                />
              )}
              <DetailRow label={t('shipping')} value={t('shippingValue')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-cream">{value}</span>
    </div>
  );
}
