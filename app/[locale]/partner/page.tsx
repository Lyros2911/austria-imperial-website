export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { partnerCommissions, orders, fulfillmentOrders } from '@/lib/db/schema';
import { sql, eq, gte, and } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import { getTranslations, getLocale } from 'next-intl/server';
import { getPartnerSession } from '@/lib/auth/partner';
import { Link } from '@/i18n/navigation';
import {
  ShoppingCart,
  Truck,
  AlertCircle,
  Clock,
  FileText,
  Package,
} from 'lucide-react';

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
    <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-slate-400 text-xs tracking-wider uppercase">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${accentColors[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-[var(--font-heading)] text-2xl text-cream font-semibold">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default async function PartnerDashboard() {
  const session = await getPartnerSession();
  if (!session) return null;

  const t = await getTranslations('partner');
  const locale = await getLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';
  const monthName = new Date().toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalOrdersResult, monthOrdersResult, recentCommissions] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(partnerCommissions)
      .where(eq(partnerCommissions.partnerConfigId, session.partnerConfigId)),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(partnerCommissions)
      .where(and(
        eq(partnerCommissions.partnerConfigId, session.partnerConfigId),
        gte(partnerCommissions.createdAt, startOfMonth),
      )),

    db.query.partnerCommissions.findMany({
      where: eq(partnerCommissions.partnerConfigId, session.partnerConfigId),
      orderBy: (pc, { desc }) => [desc(pc.createdAt)],
      limit: 5,
      with: {
        order: {
          with: {
            fulfillmentOrders: true,
          },
        },
      },
    }),
  ]);

  const totalOrders = totalOrdersResult[0]?.count ?? 0;
  const monthOrders = monthOrdersResult[0]?.count ?? 0;

  // Count active fulfillments from recent orders
  const activeFulfillments = recentCommissions.reduce((acc, pc) => {
    return acc + pc.order.fulfillmentOrders.filter(
      (fo) => !['delivered', 'cancelled'].includes(fo.status)
    ).length;
  }, 0);

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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
          {t('dashboard.title')}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {t('dashboard.overview')} — {monthName}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <KpiCard
          label={t('dashboard.totalOrders')}
          value={String(totalOrders)}
          sub={`${monthOrders} ${t('dashboard.thisMonth')}`}
          icon={ShoppingCart}
          accent="blue"
        />
        <KpiCard
          label={t('dashboard.activeShipments')}
          value={String(activeFulfillments)}
          icon={activeFulfillments > 0 ? Truck : Package}
          accent={activeFulfillments > 0 ? 'gold' : 'green'}
        />
        <KpiCard
          label={t('dashboard.ordersThisMonth')}
          value={String(monthOrders)}
          icon={ShoppingCart}
          accent="green"
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <h3 className="text-sm text-cream font-medium">{t('dashboard.recentOrders')}</h3>
          <Link
            href="/partner/orders"
            className="text-gold text-xs hover:text-gold-light transition-colors"
          >
            {t('dashboard.viewAll')} →
          </Link>
        </div>

        {recentCommissions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('dashboard.noOrders')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider px-6 py-3">
                  {t('orders.order')}
                </th>
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider px-6 py-3">
                  {t('orders.status')}
                </th>
                <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                  {t('orders.date')}
                </th>
                <th className="text-right text-[10px] text-slate-500 uppercase tracking-wider px-6 py-3">
                  {t('orders.amount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {recentCommissions.map((pc) => (
                <tr
                  key={pc.id}
                  className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-3.5">
                    <Link
                      href={`/partner/orders`}
                      className="text-cream text-sm hover:text-gold transition-colors"
                    >
                      {pc.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                        statusStyles[pc.order.status] || 'bg-gray-400/10 text-gray-400'
                      }`}
                    >
                      {t(`orders.statusLabels.${pc.order.status}` as any) || pc.order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs hidden sm:table-cell">
                    {new Date(pc.order.createdAt).toLocaleDateString(dateLocale, {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="text-cream text-sm font-medium">
                      {formatEurCents(pc.order.totalCents)}
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
