'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  ShoppingBag,
  Loader2,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  Package,
} from 'lucide-react';
import Image from 'next/image';

interface OrderItem {
  priceListItemId: number;
  productVariantId: number;
  productName: string;
  variant: string | null;
  unitPriceCents: number;
  quantity: number;
  imageUrl?: string | null;
}

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

export default function PartnerNewOrderPage() {
  const t = useTranslations('partner');

  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);
  const [error, setError] = useState('');

  // Price list for product selector
  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [priceListLoading, setPriceListLoading] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // Load items from localStorage (from price-list page) on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('b2b_order_items');
      if (stored) {
        const parsed = JSON.parse(stored) as OrderItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          localStorage.removeItem('b2b_order_items');
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    // No items pre-filled, show selector
    setShowSelector(true);
  }, []);

  const fetchPriceList = useCallback(async () => {
    setPriceListLoading(true);
    try {
      const res = await fetch('/api/partner/price-list');
      if (res.ok) {
        const data = await res.json();
        setPriceList(data.items ?? []);
      }
    } catch {
      console.error('Failed to fetch price list');
    } finally {
      setPriceListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showSelector && priceList.length === 0) {
      fetchPriceList();
    }
  }, [showSelector, priceList.length, fetchPriceList]);

  const addFromPriceList = (pl: PriceListItem) => {
    // Check if already in order
    const existing = items.find((i) => i.priceListItemId === pl.id);
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.priceListItemId === pl.id
            ? { ...i, quantity: i.quantity + pl.minOrderQty }
            : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          priceListItemId: pl.id,
          productVariantId: pl.productVariantId,
          productName: pl.productName,
          variant: pl.variant,
          unitPriceCents: pl.exportPriceCents,
          quantity: pl.minOrderQty,
          imageUrl: pl.imageUrl,
        },
      ]);
    }
    setShowSelector(false);
  };

  const updateItemQty = (priceListItemId: number, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.priceListItemId !== priceListItemId) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      })
    );
  };

  const removeItem = (priceListItemId: number) => {
    setItems((prev) => prev.filter((i) => i.priceListItemId !== priceListItemId));
  };

  const orderTotal = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );

  const handleSubmit = async () => {
    if (items.length === 0) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/partner/new-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
          })),
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess({ orderNumber: data.orderNumber || 'B2B-ORDER' });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit order');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div>
        <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl p-12 text-center max-w-lg mx-auto mt-8">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="font-[var(--font-heading)] text-xl text-cream font-semibold mb-2">
            {t('newOrder.success')}
          </h2>
          <p className="text-slate-400 text-sm mb-2">
            {t('newOrder.successMessage')}
          </p>
          <p className="text-gold font-[var(--font-heading)] font-semibold text-lg mb-6">
            {success.orderNumber}
          </p>
          <Link
            href="/partner/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gold/[0.12] text-gold border border-gold/30 hover:bg-gold/[0.2] transition-colors"
          >
            {t('newOrder.viewOrders')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
          {t('newOrder.title')}
        </h1>
      </div>

      {/* Order Summary Table */}
      {items.length > 0 ? (
        <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl overflow-hidden mb-6">
          {/* Table Header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_120px_50px] gap-4 px-6 py-3 border-b border-white/[0.06]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {t('newOrder.product')}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider text-center">
              {t('newOrder.quantity')}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider text-right">
              {t('newOrder.unitPrice')}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider text-right">
              {t('newOrder.lineTotal')}
            </span>
            <span></span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {items.map((item) => (
              <div
                key={item.priceListItemId}
                className="sm:grid sm:grid-cols-[1fr_100px_120px_120px_50px] gap-4 px-6 py-4 items-center"
              >
                {/* Product */}
                <div className="flex items-center gap-3 mb-3 sm:mb-0">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#060e1a] border border-white/[0.06]">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-cream text-sm font-medium">{item.productName}</p>
                    {item.variant && (
                      <p className="text-slate-500 text-[11px] mt-0.5">{item.variant}</p>
                    )}
                  </div>
                </div>

                {/* Quantity (editable) */}
                <div className="flex items-center justify-center gap-1.5 mb-2 sm:mb-0">
                  <button
                    onClick={() => updateItemQty(item.priceListItemId, -1)}
                    className="w-7 h-7 rounded border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-cream transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-cream text-sm font-medium tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateItemQty(item.priceListItemId, 1)}
                    className="w-7 h-7 rounded border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-cream transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Unit Price */}
                <div className="flex justify-between sm:justify-end mb-2 sm:mb-0">
                  <span className="text-slate-500 text-xs sm:hidden">{t('newOrder.unitPrice')}:</span>
                  <span className="text-slate-400 text-sm">{formatEur(item.unitPriceCents)}</span>
                </div>

                {/* Line Total */}
                <div className="flex justify-between sm:justify-end mb-2 sm:mb-0">
                  <span className="text-slate-500 text-xs sm:hidden">{t('newOrder.lineTotal')}:</span>
                  <span className="text-gold font-[var(--font-heading)] font-semibold text-sm">
                    {formatEur(item.unitPriceCents * item.quantity)}
                  </span>
                </div>

                {/* Remove */}
                <div className="flex justify-end">
                  <button
                    onClick={() => removeItem(item.priceListItemId)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title={t('newOrder.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl p-12 text-center mb-6">
          <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-4">{t('newOrder.noItems')}</p>
          <button
            onClick={() => setShowSelector(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gold/[0.12] text-gold border border-gold/30 hover:bg-gold/[0.2] transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('newOrder.addFromPriceList')}
          </button>
        </div>
      )}

      {/* Add More Products Button */}
      {items.length > 0 && !showSelector && (
        <button
          onClick={() => setShowSelector(true)}
          className="mb-6 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-slate-400 border border-white/[0.08] hover:text-cream hover:border-white/[0.15] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('newOrder.addFromPriceList')}
        </button>
      )}

      {/* Product Selector */}
      {showSelector && (
        <div className="bg-[#0a1628] border border-gold/20 rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-3 border-b border-white/[0.06]">
            <p className="text-cream text-sm font-medium">{t('newOrder.addFromPriceList')}</p>
          </div>
          {priceListLoading ? (
            <div className="px-6 py-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-gold mx-auto mb-2" />
              <p className="text-slate-500 text-xs">{t('common.loading')}</p>
            </div>
          ) : priceList.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-slate-500 text-xs">{t('priceList.noItems')}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {priceList.map((pl) => {
                const alreadyAdded = items.some((i) => i.priceListItemId === pl.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => addFromPriceList(pl)}
                    disabled={alreadyAdded}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-white/[0.02] transition-colors text-left disabled:opacity-40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#060e1a] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                        {pl.imageUrl ? (
                          <Image
                            src={pl.imageUrl}
                            alt={pl.productName}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-cream text-sm">{pl.productName}</p>
                        {pl.variant && (
                          <p className="text-slate-500 text-[10px]">{pl.variant}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gold text-sm font-medium">
                        {formatEur(pl.exportPriceCents)}
                      </span>
                      {alreadyAdded ? (
                        <span className="text-[10px] text-slate-500">Added</span>
                      ) : (
                        <Plus className="w-4 h-4 text-gold" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {items.length > 0 && (
        <div className="mb-6">
          <label className="block text-xs text-slate-400 mb-1.5">
            {t('newOrder.notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('newOrder.notesPlaceholder')}
            rows={3}
            className="w-full bg-[#0a1628] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-cream placeholder:text-slate-600 focus:outline-none focus:border-gold/30 transition-colors resize-none"
          />
        </div>
      )}

      {/* Order Total + Submit */}
      {items.length > 0 && (
        <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">{t('newOrder.orderTotal')}</span>
            <span className="font-[var(--font-heading)] text-xl text-gold font-semibold">
              {formatEur(orderTotal)}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-red-400/10 border border-red-400/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || items.length === 0}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium bg-gold text-[#060e1a] hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('newOrder.submitting')}
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                {t('newOrder.submit')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
