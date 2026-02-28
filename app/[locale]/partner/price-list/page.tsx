'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  DollarSign,
  Loader2,
  Plus,
  Minus,
  ShoppingBag,
  Package,
} from 'lucide-react';
import Image from 'next/image';

interface PriceListItem {
  id: number;
  productVariantId: number;
  productName: string;
  variant: string | null;
  imageUrl: string | null;
  exportPriceCents: number;
  minOrderQty: number;
  validFrom: string;
  validUntil: string | null;
}

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export default function PartnerPriceListPage() {
  const t = useTranslations('partner');
  const router = useRouter();

  const [items, setItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const fetchPriceList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/partner/price-list');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch {
      console.error('Failed to fetch price list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriceList();
  }, [fetchPriceList]);

  const updateQty = (itemId: number, delta: number, minQty: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      // If adding, ensure at least minOrderQty
      if (next > 0 && next < minQty) {
        return { ...prev, [itemId]: delta > 0 ? minQty : 0 };
      }
      return { ...prev, [itemId]: next };
    });
  };

  const selectedItems = items.filter((item) => (quantities[item.id] || 0) > 0);
  const totalItems = selectedItems.reduce((sum, item) => sum + (quantities[item.id] || 0), 0);
  const estimatedTotal = selectedItems.reduce(
    (sum, item) => sum + item.exportPriceCents * (quantities[item.id] || 0),
    0
  );

  const handleCreateOrder = () => {
    // Store selected items in localStorage for the new-order page
    const orderItems = selectedItems.map((item) => ({
      priceListItemId: item.id,
      productVariantId: item.productVariantId,
      productName: item.productName,
      variant: item.variant,
      unitPriceCents: item.exportPriceCents,
      quantity: quantities[item.id] || 0,
      imageUrl: item.imageUrl,
    }));
    localStorage.setItem('b2b_order_items', JSON.stringify(orderItems));
    router.push('/partner/new-order');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
          {t('priceList.title')}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {t('priceList.subtitle')}
        </p>
      </div>

      {/* Price List Table */}
      <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('common.loading')}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('priceList.noItems')}</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_120px_100px_150px_140px] gap-4 px-6 py-3 border-b border-white/[0.06]">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                {t('priceList.product')}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider text-right">
                {t('priceList.exportPrice')}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider text-center">
                {t('priceList.minQty')}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider text-center">
                {t('priceList.validFrom')} / {t('priceList.validUntil')}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider text-center">
                {t('priceList.addToOrder')}
              </span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.04]">
              {items.map((item) => {
                const qty = quantities[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="sm:grid sm:grid-cols-[1fr_120px_100px_150px_140px] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Product */}
                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                      {item.imageUrl ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#060e1a] border border-white/[0.06]">
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#060e1a] border border-white/[0.06]">
                          <Package className="w-4 h-4 text-slate-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-cream text-sm font-medium">{item.productName}</p>
                        {item.variant && (
                          <p className="text-slate-500 text-[11px] mt-0.5">{item.variant}</p>
                        )}
                      </div>
                    </div>

                    {/* Export Price */}
                    <div className="flex justify-between sm:justify-end mb-2 sm:mb-0">
                      <span className="text-slate-500 text-xs sm:hidden">{t('priceList.exportPrice')}:</span>
                      <span className="text-gold font-[var(--font-heading)] font-semibold text-sm">
                        {formatEur(item.exportPriceCents)}
                      </span>
                    </div>

                    {/* Min Order Qty */}
                    <div className="flex justify-between sm:justify-center mb-2 sm:mb-0">
                      <span className="text-slate-500 text-xs sm:hidden">{t('priceList.minQty')}:</span>
                      <span className="text-slate-400 text-sm">{item.minOrderQty}</span>
                    </div>

                    {/* Validity */}
                    <div className="flex justify-between sm:justify-center mb-3 sm:mb-0">
                      <span className="text-slate-500 text-xs sm:hidden">{t('priceList.validFrom')}:</span>
                      <span className="text-slate-500 text-xs">
                        {new Date(item.validFrom).toLocaleDateString('de-AT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                        {item.validUntil && (
                          <>
                            {' - '}
                            {new Date(item.validUntil).toLocaleDateString('de-AT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Add to Order Counter */}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, -1, item.minOrderQty)}
                        disabled={qty === 0}
                        className="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-cream hover:border-white/[0.15] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center text-cream text-sm font-medium tabular-nums">
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1, item.minOrderQty)}
                        className="w-8 h-8 rounded-lg border border-gold/20 bg-gold/[0.08] flex items-center justify-center text-gold hover:bg-gold/[0.15] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom Sticky Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30">
          <div className="bg-[#0a1628]/95 backdrop-blur-sm border-t border-white/[0.08] px-6 py-4">
            <div className="max-w-7xl flex items-center justify-between">
              <div>
                <p className="text-cream text-sm font-medium">
                  {totalItems} {t('priceList.items')}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {t('priceList.estimatedTotal')}: {formatEur(estimatedTotal)}
                </p>
              </div>
              <button
                onClick={handleCreateOrder}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gold text-[#060e1a] hover:bg-gold-light transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                {t('priceList.createOrder')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
