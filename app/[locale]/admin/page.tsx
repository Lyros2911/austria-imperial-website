export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { orders, orderItems, financialLedger, fulfillmentOrders } from '@/lib/db/schema';
import { sql, eq, gte, and, inArray } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAdminSession } from '@/lib/auth/admin';
import { Link } from '@/i18n/navigation';
import {
  ShoppingCart,
  Euro,
  TrendingUp,
  Truck,
  AlertCircle,
  Clock,
  Package,
  XCircle,
} from 'lucide-react';

// KPI Card component
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'gold',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: 'gold' | 'green' | 'red' | 'blue';
}) {
  const accentColors = {
    gold: 'text-gold bg-gold/[0.08] border-gold/20',
    green: 'text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20',
    red: 'text-red-400 bg-red-400/[0.08] border-red-400/20',
    blue: 'text-blue-400 bg-blue-400/[0.08] border-blue-400/20',
  };

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-muted text-xs tracking-wider uppercase">{label}</p>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center border ${accentColors[accent]}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-[var(--font-heading)] text-2xl text-cream font-semibold">{value}</p>
      {sub && <p className="text-muted text-xs mt-1">{sub}</p>}
    </div>
  );
}

async function getDashboardData(producer?: string | null) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Producer-specific dashboard: only their orders/fulfillments
  if (producer) {
    const producerVal = producer;

    const [
      monthFulfillmentsResult,
      pendingFulfillmentResult,
      shippedFulfillmentResult,
      failedFulfillmentResult,
      recentFulfillments,
    ] = await Promise.all([
      // Fulfillments this month for this producer
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(fulfillmentOrders)
        .where(and(
          sql`${fulfillmentOrders.producer} = ${producerVal}`,
          gte(fulfillmentOrders.createdAt, startOfMonth),
        )),

      // Pending fulfillments
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(fulfillmentOrders)
        .where(and(
          sql`${fulfillmentOrders.producer} = ${producerVal}`,
          eq(fulfillmentOrders.status, 'pending'),
        )),

      // Shipped fulfillments this month
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(fulfillmentOrders)
        .where(and(
          sql`${fulfillmentOrders.producer} = ${producerVal}`,
          eq(fulfillmentOrders.status, 'shipped'),
          gte(fulfillmentOrders.createdAt, startOfMonth),
        )),

      // Failed fulfillments
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(fulfillmentOrders)
        .where(and(
          sql`${fulfillmentOrders.producer} = ${producerVal}`,
          eq(fulfillmentOrders.status, 'failed'),
        )),

      // Recent fulfillment orders with parent order data
      db.query.fulfillmentOrders.findMany({
        where: sql`${fulfillmentOrders.producer} = ${producerVal}`,
        orderBy: (fo, { desc }) => [desc(fo.createdAt)],
        limit: 10,
        with: {
          order: true,
        },
      }),
    ]);

    return {
      isProducer: true as const,
      monthFulfillments: monthFulfillmentsResult[0]?.count ?? 0,
      pendingFulfillment: pendingFulfillmentResult[0]?.count ?? 0,
      shippedFulfillment: shippedFulfillmentResult[0]?.count ?? 0,
      failedFulfillment: failedFulfillmentResult[0]?.count ?? 0,
      recentFulfillments,
    };
  }

  // Admin/Viewer dashboard: full overview
  const [
    totalOrdersResult,
    monthOrdersResult,
    monthRevenueResult,
    monthProfitResult,
    pendingFulfillmentResult,
    recentOrders,
  ] = await Promise.all([
    // Total orders (all time)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders),

    // Orders this month
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(gte(orders.createdAt, startOfMonth)),

    // Revenue this month (from ledger, not orders)
    db
      .select({
        total: sql<number>`COALESCE(SUM(revenue_cents), 0)::int`,
      })
      .from(financialLedger)
      .where(gte(financialLedger.createdAt, startOfMonth)),

    // Gross profit this month
    db
      .select({
        grossProfit: sql<number>`COALESCE(SUM(gross_profit_cents), 0)::int`,
        auryxShare: sql<number>`COALESCE(SUM(auryx_share_cents), 0)::int`,
        peterShare: sql<number>`COALESCE(SUM(peter_share_cents), 0)::int`,
        aiggShare: sql<number>`COALESCE(SUM(aigg_share_cents), 0)::int`,
      })
      .from(financialLedger)
      .where(gte(financialLedger.createdAt, startOfMonth)),

    // Pending fulfillments
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(fulfillmentOrders)
      .where(eq(fulfillmentOrders.status, 'pending')),

    // Recent 5 orders
    db.query.orders.findMany({
      orderBy: (o, { desc }) => [desc(o.createdAt)],
      limit: 5,
      with: {
        items: true,
      },
    }),
  ]);

  return {
    isProducer: false as const,
    totalOrders: totalOrdersResult[0]?.count ?? 0,
    monthOrders: monthOrdersResult[0]?.count ?? 0,
    monthRevenue: monthRevenueResult[0]?.total ?? 0,
    monthGrossProfit: monthProfitResult[0]?.grossProfit ?? 0,
    monthAuryxShare: monthProfitResult[0]?.auryxShare ?? 0,
    monthPeterShare: monthProfitResult[0]?.peterShare ?? 0,
    monthAiggShare: monthProfitResult[0]?.aiggShare ?? 0,
    pendingFulfillment: pendingFulfillmentResult[0]?.count ?? 0,
    recentOrders,
  };
}

export default async function AdminDashboard() {
  const session = await getAdminSession();
  const data = await getDashboardData(session?.producer);
  const t = await getTranslations('admin');
  const locale = await getLocale();

  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';
  const monthName = new Date().toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });

  // Fulfillment status styles
  const fulfillmentStatusStyles: Record<string, string> = {
    pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    sent_to_producer: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    confirmed: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    shipped: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
    delivered: 'bg-green-400/10 text-green-400 border-green-400/20',
    failed: 'bg-red-400/10 text-red-400 border-red-400/20',
    cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  };

  // Order status styles
  const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    paid: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    processing: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    partially_shipped: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    shipped: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
    delivered: 'bg-green-400/10 text-green-400 border-green-400/20',
    cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
    refunded: 'bg-red-400/10 text-red-400 border-red-400/20',
  };

  // ═══ PRODUCER DASHBOARD ═══
  if (data.isProducer) {
    const producerLabel = session?.producer
      ? t(`producerLabel.${session.producer}` as any)
      : '';

    return (
      <div>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {producerLabel} — {t('dashboard.title')}
          </h1>
          <p className="text-muted text-sm mt-1">
            {t('producerDashboard.fulfillmentOverview')} — {monthName}
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label={t('producerDashboard.monthlyOrders')}
            value={String(data.monthFulfillments)}
            icon={ShoppingCart}
            accent="blue"
          />
          <KpiCard
            label={t('producerDashboard.openFulfillments')}
            value={String(data.pendingFulfillment)}
            icon={data.pendingFulfillment > 0 ? AlertCircle : Truck}
            accent={data.pendingFulfillment > 0 ? 'red' : 'green'}
          />
          <KpiCard
            label={t('producerDashboard.shippedPackages')}
            value={String(data.shippedFulfillment)}
            icon={Package}
            accent="green"
          />
          <KpiCard
            label={t('producerDashboard.failedOrders')}
            value={String(data.failedFulfillment)}
            icon={data.failedFulfillment > 0 ? XCircle : Truck}
            accent={data.failedFulfillment > 0 ? 'red' : 'green'}
          />
        </div>

        {/* Recent Fulfillments */}
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm text-cream font-medium">{t('producerDashboard.recentFulfillments')}</h3>
            <Link
              href="/admin/fulfillment"
              className="text-gold text-xs hover:text-gold-light transition-colors"
            >
              {t('dashboard.viewAll')} →
            </Link>
          </div>

          {data.recentFulfillments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Clock className="w-8 h-8 text-muted/30 mx-auto mb-3" />
              <p className="text-muted text-sm">{t('dashboard.noOrders')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('orders.order')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('orders.status')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                    {t('producerDashboard.tracking')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                    {t('orders.date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentFulfillments.map((fo) => (
                  <tr
                    key={fo.id}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <span className="text-cream text-sm">
                        {fo.order?.orderNumber || `#${fo.orderId}`}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                          fulfillmentStatusStyles[fo.status] || 'bg-gray-400/10 text-gray-400'
                        }`}
                      >
                        {t(`fulfillmentStatus.${fo.status}` as any) || fo.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted text-xs hidden sm:table-cell">
                      {fo.trackingNumber || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-muted text-xs hidden sm:table-cell">
                      {new Date(fo.createdAt).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ═══ ADMIN / VIEWER DASHBOARD ═══
  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">{t('dashboard.title')}</h1>
        <p className="text-muted text-sm mt-1">
          {t('dashboard.overview')} — {monthName}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label={t('dashboard.ordersMonth')}
          value={String(data.monthOrders)}
          sub={`${data.totalOrders} ${t('dashboard.total')}`}
          icon={ShoppingCart}
          accent="blue"
        />
        <KpiCard
          label={t('dashboard.revenueMonth')}
          value={formatEurCents(data.monthRevenue)}
          icon={Euro}
          accent="gold"
        />
        <KpiCard
          label={t('dashboard.grossProfit')}
          value={formatEurCents(data.monthGrossProfit)}
          sub={`${t('dashboard.peter')}: ${formatEurCents(data.monthPeterShare)} · AIGG: ${formatEurCents(data.monthAiggShare)}`}
          icon={TrendingUp}
          accent="green"
        />
        <KpiCard
          label={t('dashboard.pendingFulfillments')}
          value={String(data.pendingFulfillment)}
          icon={data.pendingFulfillment > 0 ? AlertCircle : Truck}
          accent={data.pendingFulfillment > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Profit Split Visualization */}
      {data.monthGrossProfit > 0 && (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6 mb-8">
          <h3 className="text-sm text-muted tracking-wider uppercase mb-4">{t('dashboard.revenueWaterfall')} {monthName}</h3>
          <div className="flex gap-1.5 h-8 rounded-lg overflow-hidden">
            {data.monthAuryxShare > 0 && (
              <div
                className="bg-blue-500/80 rounded-l-lg flex items-center justify-center text-[10px] font-semibold text-white"
                style={{ width: `${Math.max(10, (data.monthAuryxShare / data.monthGrossProfit) * 100)}%` }}
              >
                {t('dashboard.auryx10')} · {formatEurCents(data.monthAuryxShare)}
              </div>
            )}
            <div
              className={`bg-gold/80 ${data.monthAuryxShare <= 0 ? 'rounded-l-lg' : ''} flex items-center justify-center text-[10px] font-semibold text-black`}
              style={{ width: `${Math.max(20, (data.monthPeterShare / data.monthGrossProfit) * 100)}%` }}
            >
              {t('dashboard.peter')} · {formatEurCents(data.monthPeterShare)}
            </div>
            <div
              className="bg-emerald-600/80 rounded-r-lg flex items-center justify-center text-[10px] font-semibold text-white"
              style={{ width: `${Math.max(20, (data.monthAiggShare / data.monthGrossProfit) * 100)}%` }}
            >
              {t('dashboard.gottfried')} · {formatEurCents(data.monthAiggShare)}
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm text-cream font-medium">{t('dashboard.recentOrders')}</h3>
          <Link
            href="/admin/orders"
            className="text-gold text-xs hover:text-gold-light transition-colors"
          >
            {t('dashboard.viewAll')} →
          </Link>
        </div>

        {data.recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">{t('dashboard.noOrders')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                  {t('orders.order')}
                </th>
                <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                  {t('orders.status')}
                </th>
                <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                  {t('orders.date')}
                </th>
                <th className="text-right text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                  {t('orders.amount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-3.5">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-cream text-sm hover:text-gold transition-colors"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-muted text-[11px] mt-0.5">
                      {order.guestEmail || order.shippingName || '—'}
                    </p>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                        statusStyles[order.status] || 'bg-gray-400/10 text-gray-400'
                      }`}
                    >
                      {t(`status.${order.status}` as any) || order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-muted text-xs hidden sm:table-cell">
                    {new Date(order.createdAt).toLocaleDateString(dateLocale, {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="text-cream text-sm font-medium">
                      {formatEurCents(order.totalCents)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
