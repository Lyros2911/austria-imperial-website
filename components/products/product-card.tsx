import Link from 'next/link';
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
      {/* Image area (placeholder gradient) */}
      <div className="relative h-64 overflow-hidden">
        <div
          className={`absolute inset-0 ${
            isKernoel
              ? 'bg-gradient-to-br from-[#1a1a0e] via-[#1e2a10] to-[#0d0c09]'
              : 'bg-gradient-to-br from-[#1a1510] via-[#1c1810] to-[#0d0c09]'
          }`}
        />
        {/* Decorative accent */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-32 h-32 rounded-full blur-3xl opacity-20 ${
              isKernoel ? 'bg-green' : 'bg-gold-dark'
            }`}
          />
        </div>
        {/* Category badge */}
        <div className="absolute top-4 left-4">
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
