import Link from 'next/link';
import Image from 'next/image';
import { formatEurCents } from '@/lib/utils';
import type { Product, ProductVariant } from '@/lib/db/schema';

interface ProductCardProps {
  product: Product & { variants: ProductVariant[] };
}

export function ProductCard({ product }: ProductCardProps) {
  const cheapestVariant = product.variants[0];
  const isKernoel = product.category === 'kernoel';

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative bg-surface border border-border hover:border-border-gold rounded-lg overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(197,165,90,0.06)]"
    >
      {/* Image area */}
      <div className="relative h-64 overflow-hidden">
        {isKernoel ? (
          <Image
            src="/images/kernoel-flaschen.jpg"
            alt={product.nameDe}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <Image
            src="/images/kren-produkte.jpg"
            alt={product.nameDe}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
        {/* Category badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="text-gold/60 text-[10px] tracking-[0.3em] uppercase bg-[var(--aigg-black)]/60 backdrop-blur-sm px-3 py-1 rounded-full border border-border-gold">
            {isKernoel ? 'Kürbiskernöl' : 'Kren'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-3">
        <h3 className="font-[var(--font-heading)] text-xl text-cream group-hover:text-gold transition-colors duration-300">
          {product.nameDe}
        </h3>
        <p className="text-muted text-sm leading-relaxed line-clamp-2">
          {product.descriptionDe}
        </p>
        <div className="flex items-baseline gap-2 pt-2">
          <span className="text-xs text-muted">ab</span>
          <span className="text-gold text-lg font-[var(--font-heading)] font-semibold">
            {cheapestVariant ? formatEurCents(cheapestVariant.priceCents) : '–'}
          </span>
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute bottom-6 right-6 text-muted group-hover:text-gold transition-all duration-300 group-hover:translate-x-1">
        →
      </div>
    </Link>
  );
}
