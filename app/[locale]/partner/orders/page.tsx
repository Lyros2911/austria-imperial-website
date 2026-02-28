'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ShoppingCart, Loader2, Truck, Package } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface PartnerOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  itemCount: number;
  fulfillments: {
    id: number;
    status: string;
    producer: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  }[];
}

function formatEur(cents: number) {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  paid: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  processing: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  partially_shipped: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  shipped: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
  delivered: 'bg-green-400/10 text-green-400 border-green-400/20',
  cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  refunded: 'bg-red-400/10 text-red-400 border-red-400/20',
};

const FULFILLMENT_STYLES: Record<string, string> = {
  pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  sent_to_producer: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  confirmed: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  shipped: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
  delivered: 'bg-green-400/10 text-green-400 border-green-400/20',
  failed: 'bg-red-400/10 text-red-400 border-red-400/20',
  cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
};

export default function PartnerOrdersPage() {
  const t = useTranslations('partner');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/partner/orders?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
          {t('orders.title')}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {t('orders.totalCount', { count: total })}
        </p>
      </div>

      {/* Orders List */}
      <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('common.loading')}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('orders.noOrders')}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/[0.04]">
              {orders.map((order) => (
                <div key={order.id}>
                  {/* Order Row */}
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-cream text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {order.itemCount} {t('orders.items')} · {new Date(order.createdAt).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                          STATUS_STYLES[order.status] || 'bg-gray-400/10 text-gray-400'
                        }`}
                      >
                        {t(`orders.statusLabels.${order.status}` as any) || order.status}
                      </span>
                      <span className="text-gold font-[var(--font-heading)] font-semibold text-sm">
                        {formatEur(order.totalCents)}
                      </span>
                    </div>
                  </button>

                  {/* Expanded: Fulfillment Details */}
                  {expandedOrder === order.id && order.fulfillments.length > 0 && (
                    <div className="px-6 pb-4 bg-white/[0.01]">
                      <div className="ml-14 space-y-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                          {t('orders.fulfillments')}
                        </p>
                        {order.fulfillments.map((fo) => (
                          <div
                            key={fo.id}
                            className="flex items-center justify-between bg-[#060e1a] border border-white/[0.06] rounded-lg px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              {fo.status === 'shipped' || fo.status === 'delivered' ? (
                                <Truck className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Package className="w-4 h-4 text-slate-500" />
                              )}
                              <div>
                                <p className="text-cream text-xs capitalize">{fo.producer}</p>
                                {fo.trackingNumber && (
                                  <p className="text-slate-500 text-[10px] mt-0.5 font-mono">
                                    {fo.trackingUrl ? (
                                      <a href={fo.trackingUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                                        {fo.trackingNumber}
                                      </a>
                                    ) : (
                                      fo.trackingNumber
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[9px] font-medium border ${
                                FULFILLMENT_STYLES[fo.status] || 'bg-gray-400/10 text-gray-400'
                              }`}
                            >
                              {t(`orders.fulfillmentStatus.${fo.status}` as any) || fo.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
                <p className="text-slate-500 text-xs">
                  {t('orders.page')} {page} {t('orders.of')} {totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <button
                      onClick={() => setPage(page - 1)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-cream border border-white/[0.08] rounded transition-colors"
                    >
                      ← {t('orders.previous')}
                    </button>
                  )}
                  {page < totalPages && (
                    <button
                      onClick={() => setPage(page + 1)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-cream border border-white/[0.08] rounded transition-colors"
                    >
                      {t('orders.next')} →
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
