export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { orders, financialLedger, fulfillmentOrders } from '@/lib/db/schema';
import { sql, eq, gte, and } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import {
  ShoppingCart,
  Euro,
  TrendingUp,
  Truck,
  AlertCircle,
  Clock,
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

async function getDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run queries in parallel
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
  const data = await getDashboardData();
  const monthName = new Date().toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          Übersicht — {monthName}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Bestellungen (Monat)"
          value={String(data.monthOrders)}
          sub={`${data.totalOrders} gesamt`}
          icon={ShoppingCart}
          accent="blue"
        />
        <KpiCard
          label="Umsatz (Monat)"
          value={formatEurCents(data.monthRevenue)}
          icon={Euro}
          accent="gold"
        />
        <KpiCard
          label="Bruttogewinn"
          value={formatEurCents(data.monthGrossProfit)}
          sub={`Peter: ${formatEurCents(data.monthPeterShare)} · AIGG: ${formatEurCents(data.monthAiggShare)}`}
          icon={TrendingUp}
          accent="green"
        />
        <KpiCard
          label="Offene Fulfillments"
          value={String(data.pendingFulfillment)}
          icon={data.pendingFulfillment > 0 ? AlertCircle : Truck}
          accent={data.pendingFulfillment > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Profit Split Visualization */}
      {data.monthGrossProfit > 0 && (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6 mb-8">
          <h3 className="text-sm text-muted tracking-wider uppercase mb-4">Revenue-Waterfall {monthName}</h3>
          <div className="flex gap-1.5 h-8 rounded-lg overflow-hidden">
            {data.monthAuryxShare > 0 && (
              <div
                className="bg-blue-500/80 rounded-l-lg flex items-center justify-center text-[10px] font-semibold text-white"
                style={{ width: `${Math.max(10, (data.monthAuryxShare / data.monthGrossProfit) * 100)}%` }}
              >
                Auryx 10% · {formatEurCents(data.monthAuryxShare)}
              </div>
            )}
            <div
              className={`bg-gold/80 ${data.monthAuryxShare <= 0 ? 'rounded-l-lg' : ''} flex items-center justify-center text-[10px] font-semibold text-black`}
              style={{ width: `${Math.max(20, (data.monthPeterShare / data.monthGrossProfit) * 100)}%` }}
            >
              Peter · {formatEurCents(data.monthPeterShare)}
            </div>
            <div
              className="bg-emerald-600/80 rounded-r-lg flex items-center justify-center text-[10px] font-semibold text-white"
              style={{ width: `${Math.max(20, (data.monthAiggShare / data.monthGrossProfit) * 100)}%` }}
            >
              Gottfried · {formatEurCents(data.monthAiggShare)}
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm text-cream font-medium">Letzte Bestellungen</h3>
          <a
            href="/admin/orders"
            className="text-gold text-xs hover:text-gold-light transition-colors"
          >
            Alle anzeigen →
          </a>
        </div>

        {data.recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">Noch keine Bestellungen</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                  Bestellung
                </th>
                <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                  Datum
                </th>
                <th className="text-right text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                  Betrag
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
                    <a
                      href={`/admin/orders/${order.id}`}
                      className="text-cream text-sm hover:text-gold transition-colors"
                    >
                      {order.orderNumber}
                    </a>
                    <p className="text-muted text-[11px] mt-0.5">
                      {order.guestEmail || order.shippingName || '—'}
                    </p>
                  </td>
                  <td className="px-6 py-3.5">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-3.5 text-muted text-xs hidden sm:table-cell">
                    {new Date(order.createdAt).toLocaleDateString('de-AT', {
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

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    paid: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    processing: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    partially_shipped: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    shipped: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
    delivered: 'bg-green-400/10 text-green-400 border-green-400/20',
    cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
    refunded: 'bg-red-400/10 text-red-400 border-red-400/20',
  };

  const labels: Record<string, string> = {
    pending: 'Ausstehend',
    paid: 'Bezahlt',
    processing: 'In Bearbeitung',
    partially_shipped: 'Teilversandt',
    shipped: 'Versandt',
    delivered: 'Zugestellt',
    cancelled: 'Storniert',
    refunded: 'Erstattet',
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
        styles[status] || 'bg-gray-400/10 text-gray-400'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
