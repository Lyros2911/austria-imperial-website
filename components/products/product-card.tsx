import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { formatEurCents } from '@/lib/utils';
import { getLocalizedField } from '@/lib/i18n-helpers';
import type { Product, ProductVariant } from '@/lib/db/schema';
import { getTranslations } from 'next-intl/server';

interface ProductCardProps {
  product: Product & { variants: ProductVariant[] };
  locale: string;
}

const CATEGORY_IMAGES: Record<string, string> = {
  kernoel: '/images/kernoel-flaschen.jpg',
  kren: '/images/kren-produkte.jpg',
  tiernahrung: '/images/kren-produkte.jpg',
};

export async function ProductCard({ product, locale }: ProductCardProps) {
  const t = await getTranslations({ locale, namespace: 'products' });
  const cheapestVariant = product.variants[0];
  const hasActiveVariants = product.variants.length > 0;
  const categoryLabel = t(`categories.${product.category}`);
  const imageSrc = CATEGORY_IMAGES[product.category] ?? '/images/kren-produkte.jpg';
  const productName = getLocalizedField(product as unknown as Record<string, unknown>, 'name', locale);
  const productDesc = getLocalizedField(product as unknown as Record<string, unknown>, 'description', locale);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative bg-surface border border-border hover:border-border-gold rounded-lg overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(197,165,90,0.06)]"
    >
      {/* Image area */}
      <div className="relative h-64 overflow-hidden">
        <Image
          src={imageSrc}
          alt={productName}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        {/* Category badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="text-gold/60 text-[10px] tracking-[0.3em] uppercase bg-[var(--aigg-black)]/60 backdrop-blur-sm px-3 py-1 rounded-full border border-border-gold">
            {categoryLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-3">
        <h3 className="font-[var(--font-heading)] text-xl text-cream group-hover:text-gold transition-colors duration-300">
          {productName}
        </h3>
        <p className="text-muted text-sm leading-relaxed line-clamp-2">
          {productDesc}
        </p>
        <div className="flex items-baseline gap-2 pt-2">
          {hasActiveVariants && cheapestVariant ? (
            <>
              <span className="text-xs text-muted">{t('from')}</span>
              <span className="text-gold text-lg font-[var(--font-heading)] font-semibold">
                {formatEurCents(cheapestVariant.priceCents)}
              </span>
            </>
          ) : (
            <span className="text-gold/60 text-sm font-[var(--font-heading)] italic">
              {t('comingSoon')}
            </span>
          )}
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute bottom-6 right-6 text-muted group-hover:text-gold transition-all duration-300 group-hover:translate-x-1">
        →
      </div>
    </Link>
  );
}
