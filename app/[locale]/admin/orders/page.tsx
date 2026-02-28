export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { orders, orderItems } from '@/lib/db/schema';
import { desc, eq, sql, and, gte, lte, or, ilike, inArray } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAdminSession } from '@/lib/auth/admin';
import { ShoppingCart, Search, Filter } from 'lucide-react';

interface SearchParams {
  status?: string;
  page?: string;
  from?: string;
  to?: string;
  email?: string;
}

const PAGE_SIZE = 20;

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

async function getOrders(params: SearchParams, producer?: string | null) {
  const page = Math.max(1, parseInt(params.page || '1'));
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];

  // Producer filter: only show orders that contain items from this producer
  if (producer) {
    const producerVal = producer as 'kiendler' | 'hernach';
    const producerOrderIds = db
      .selectDistinct({ orderId: orderItems.orderId })
      .from(orderItems)
      .where(eq(orderItems.producer, producerVal));
    conditions.push(inArray(orders.id, producerOrderIds));
  }

  if (params.status && params.status !== '') {
    conditions.push(eq(orders.status, params.status as typeof orders.status.enumValues[number]));
  }

  if (params.from) {
    conditions.push(gte(orders.createdAt, new Date(params.from)));
  }

  if (params.to) {
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(orders.createdAt, toDate));
  }

  if (params.email) {
    conditions.push(ilike(orders.guestEmail, params.email));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [ordersList, countResult] = await Promise.all([
    db.query.orders.findMany({
      where,
      orderBy: (o, { desc: d }) => [d(o.createdAt)],
      limit: PAGE_SIZE,
      offset,
      with: {
        items: true,
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(where),
  ]);

  return {
    orders: ordersList,
    total: countResult[0]?.count ?? 0,
    page,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / PAGE_SIZE),
  };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await getAdminSession();
  const data = await getOrders(params, session?.producer);
  const t = await getTranslations('admin');
  const locale = await getLocale();

  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  const statusOptions = [
    { value: '', label: t('common.allStatuses') },
    { value: 'pending', label: t('status.pending') },
    { value: 'paid', label: t('status.paid') },
    { value: 'processing', label: t('status.processing') },
    { value: 'partially_shipped', label: t('status.partially_shipped') },
    { value: 'shipped', label: t('status.shipped') },
    { value: 'delivered', label: t('status.delivered') },
    { value: 'cancelled', label: t('status.cancelled') },
    { value: 'refunded', label: t('status.refunded') },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {t('orders.title')}
          </h1>
          <p className="text-muted text-sm mt-1">{t('orders.totalCount', { count: data.total })}</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6" method="GET">
        <select
          name="status"
          defaultValue={params.status || ''}
          className="bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="from"
          defaultValue={params.from || ''}
          placeholder="Von"
          className="bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
        />

        <input
          type="date"
          name="to"
          defaultValue={params.to || ''}
          placeholder="Bis"
          className="bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
        />

        <button
          type="submit"
          className="flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold rounded-lg px-4 py-2 text-sm hover:bg-gold/20 transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          {t('orders.filter')}
        </button>

        {(params.status || params.from || params.to) && (
          <Link
            href="/admin/orders"
            className="flex items-center text-muted text-sm hover:text-cream px-3 py-2 transition-colors"
          >
            {t('orders.resetFilter')}
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        {data.orders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingCart className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">{t('orders.noOrders')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                      {t('orders.order')}
                    </th>
                    <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                      {t('orders.customer')}
                    </th>
                    <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                      {t('orders.status')}
                    </th>
                    <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3 hidden md:table-cell">
                      {t('orders.positions')}
                    </th>
                    <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3 hidden lg:table-cell">
                      {t('orders.date')}
                    </th>
                    <th className="text-right text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                      {t('orders.amount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-cream text-sm font-medium hover:text-gold transition-colors"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-cream text-sm">{order.shippingName || '—'}</p>
                        <p className="text-muted text-[11px]">
                          {order.guestEmail || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                            STATUS_STYLES[order.status] || 'bg-gray-400/10 text-gray-400'
                          }`}
                        >
                          {t(`status.${order.status}` as any) || order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted text-xs hidden md:table-cell">
                        {order.items.length} {t('orders.items')}
                      </td>
                      <td className="px-5 py-3.5 text-muted text-xs hidden lg:table-cell">
                        {new Date(order.createdAt).toLocaleDateString(dateLocale, {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-gold font-[var(--font-heading)] font-semibold text-sm">
                          {formatEurCents(order.totalCents)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
                <p className="text-muted text-xs">
                  {t('orders.page')} {data.page} {t('orders.of')} {data.totalPages}
                </p>
                <div className="flex gap-2">
                  {data.page > 1 && (
                    <Link
                      href={`/admin/orders?page=${data.page - 1}${params.status ? `&status=${params.status}` : ''}${params.from ? `&from=${params.from}` : ''}${params.to ? `&to=${params.to}` : ''}`}
                      className="px-3 py-1.5 text-xs text-muted hover:text-cream border border-white/[0.08] rounded transition-colors"
                    >
                      ← {t('orders.previous')}
                    </Link>
                  )}
                  {data.page < data.totalPages && (
                    <Link
                      href={`/admin/orders?page=${data.page + 1}${params.status ? `&status=${params.status}` : ''}${params.from ? `&from=${params.from}` : ''}${params.to ? `&to=${params.to}` : ''}`}
                      className="px-3 py-1.5 text-xs text-muted hover:text-cream border border-white/[0.08] rounded transition-colors"
                    >
                      {t('orders.next')} →
                    </Link>
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
