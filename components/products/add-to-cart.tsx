'use client';

import { useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { formatEurCents } from '@/lib/utils';
import { ShoppingBag, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ProductInfo {
  id: number;
  slug: string;
  nameDe: string;
  producer: string;
}

interface VariantInfo {
  id: number;
  sku: string;
  nameDe: string;
  priceCents: number;
  sizeMl: number | null;
}

export function AddToCartSection({
  product,
  variants,
}: {
  product: ProductInfo;
  variants: VariantInfo[];
}) {
  const { addItem } = useCart();
  const t = useTranslations('addToCart');
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];
  if (!selected) return null;

  const handleAdd = () => {
    addItem(
      {
        variantId: selected.id,
        productSlug: product.slug,
        productName: product.nameDe,
        variantName: selected.nameDe,
        sku: selected.sku,
        priceCents: selected.priceCents,
        sizeMl: selected.sizeMl,
        producer: product.producer,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Variant selector */}
      {variants.length > 1 && (
        <div className="space-y-3">
          <label className="text-muted text-xs tracking-[0.2em] uppercase">{t('selectSize')}</label>
          <div className="flex gap-3 flex-wrap">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => { setSelectedId(v.id); setAdded(false); }}
                className={`px-5 py-3 rounded border text-sm transition-all duration-200 ${
                  v.id === selectedId
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border text-muted hover:border-border-gold hover:text-cream'
                }`}
              >
                <span className="font-medium">{v.nameDe}</span>
                <span className="block text-xs mt-0.5 opacity-70">
                  {formatEurCents(v.priceCents)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-gold text-3xl font-[var(--font-heading)] font-semibold">
          {formatEurCents(selected.priceCents)}
        </span>
        <span className="text-muted text-sm">{t('inclVat')}</span>
      </div>

      {/* Quantity + Add to Cart */}
      <div className="flex gap-4">
        {/* Quantity */}
        <div className="flex items-center border border-border rounded">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-4 py-3 text-muted hover:text-cream transition-colors text-sm"
          >
            −
          </button>
          <span className="px-3 py-3 text-cream text-sm font-medium min-w-[2rem] text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="px-4 py-3 text-muted hover:text-cream transition-colors text-sm"
          >
            +
          </button>
        </div>

        {/* Add to Cart button */}
        <button
          onClick={handleAdd}
          className={`flex-1 flex items-center justify-center gap-2.5 font-semibold text-sm tracking-wide py-3.5 rounded transition-all duration-300 ${
            added
              ? 'bg-green text-cream'
              : 'bg-gold hover:bg-gold-light text-[var(--aigg-black)] hover:shadow-[0_0_30px_rgba(197,165,90,0.15)]'
          }`}
        >
          {added ? (
            <>
              <Check className="w-4 h-4" />
              {t('added')}
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" strokeWidth={2} />
              {t('addToCart')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
