export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { fulfillmentOrders } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { Link } from '@/i18n/navigation';
import { Truck, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAdminSession } from '@/lib/auth/admin';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  sent_to_producer: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  confirmed: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
  shipped: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  delivered: 'bg-green-400/10 text-green-400 border-green-400/20',
  failed: 'bg-red-400/10 text-red-400 border-red-400/20',
  cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
};

async function getFulfillmentData(producer?: string | null) {
  const producerVal = producer ?? undefined;

  // Stats overview — optionally filtered by producer
  const statsQuery = db
    .select({
      status: fulfillmentOrders.status,
      count: sql<number>`count(*)::int`,
    })
    .from(fulfillmentOrders);

  const stats = producerVal
    ? await statsQuery.where(sql`${fulfillmentOrders.producer} = ${producerVal}`).groupBy(fulfillmentOrders.status)
    : await statsQuery.groupBy(fulfillmentOrders.status);

  // Active fulfillments (not delivered/cancelled) — optionally filtered by producer
  const active = await db.query.fulfillmentOrders.findMany({
    where: producerVal
      ? (fo, { and: a, notInArray: ni }) =>
          a(sql`${fo.producer} = ${producerVal}`, ni(fo.status, ['delivered', 'cancelled']))
      : (fo, { notInArray: ni }) =>
          ni(fo.status, ['delivered', 'cancelled']),
    orderBy: (fo, { desc: d }) => [d(fo.createdAt)],
    limit: 50,
    with: {
      order: true,
    },
  });

  const statsMap: Record<string, number> = {};
  stats.forEach((s) => {
    statsMap[s.status] = s.count;
  });

  return { stats: statsMap, active };
}

export default async function FulfillmentPage() {
  const session = await getAdminSession();
  const data = await getFulfillmentData(session?.producer);
  const t = await getTranslations('admin');
  const locale = await getLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';
  const isProducer = session?.role === 'producer';

  const STATUS_LABELS: Record<string, string> = {
    pending: t('fulfillmentStatus.pending'),
    sent_to_producer: t('fulfillmentStatus.sent_to_producer'),
    confirmed: t('fulfillmentStatus.confirmed'),
    shipped: t('fulfillmentStatus.shipped'),
    delivered: t('fulfillmentStatus.delivered'),
    failed: t('fulfillmentStatus.failed'),
    cancelled: t('fulfillmentStatus.cancelled'),
  };

  const pendingCount = data.stats['pending'] || 0;
  const failedCount = data.stats['failed'] || 0;
  const shippedCount = data.stats['shipped'] || 0;
  const deliveredCount = data.stats['delivered'] || 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">{t('fulfillmentPage.title')}</h1>
        <p className="text-muted text-sm mt-1">{t('fulfillmentPage.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('fulfillmentPage.pending')}
          value={pendingCount}
          icon={Clock}
          accent="yellow"
        />
        <StatCard
          label={t('fulfillmentPage.failed')}
          value={failedCount}
          icon={AlertTriangle}
          accent="red"
        />
        <StatCard
          label={t('fulfillmentPage.shipped')}
          value={shippedCount}
          icon={Truck}
          accent="blue"
        />
        <StatCard
          label={t('fulfillmentPage.delivered')}
          value={deliveredCount}
          icon={CheckCircle}
          accent="green"
        />
      </div>

      {/* Active Table */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-cream text-sm font-medium">{t('fulfillmentPage.activeOrders')}</h3>
        </div>

        {data.active.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Package className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">{t('fulfillmentPage.noActiveOrders')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                    {t('fulfillmentPage.order')}
                  </th>
                  {!isProducer && (
                    <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                      {t('fulfillmentPage.producerCol')}
                    </th>
                  )}
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                    {t('fulfillmentPage.statusCol')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3 hidden md:table-cell">
                    {t('fulfillmentPage.trackingCol')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3 hidden lg:table-cell">
                    {t('fulfillmentPage.createdCol')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3 hidden lg:table-cell">
                    {t('fulfillmentPage.retriesCol')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.active.map((fo) => (
                  <tr
                    key={fo.id}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/orders/${fo.orderId}`}
                        className="text-cream text-sm hover:text-gold transition-colors"
                      >
                        {fo.order.orderNumber}
                      </Link>
                    </td>
                    {!isProducer && (
                      <td className="px-5 py-3.5 text-cream text-sm capitalize">
                        {fo.producer}
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                          STATUS_STYLES[fo.status] || 'bg-gray-400/10 text-gray-400'
                        }`}
                      >
                        {STATUS_LABELS[fo.status] || fo.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted text-xs font-mono hidden md:table-cell">
                      {fo.trackingNumber || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-muted text-xs hidden lg:table-cell">
                      {new Date(fo.createdAt).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-muted text-xs hidden lg:table-cell">
                      {fo.retryCount > 0 ? (
                        <span className="text-red-400">{fo.retryCount}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: 'yellow' | 'red' | 'blue' | 'green';
}) {
  const colors = {
    yellow: 'text-yellow-400 bg-yellow-400/[0.08] border-yellow-400/20',
    red: 'text-red-400 bg-red-400/[0.08] border-red-400/20',
    blue: 'text-blue-400 bg-blue-400/[0.08] border-blue-400/20',
    green: 'text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20',
  };

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded flex items-center justify-center border ${colors[accent]}`}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-muted text-[10px] tracking-wider uppercase">{label}</span>
      </div>
      <p className="font-[var(--font-heading)] text-xl text-cream font-semibold">{value}</p>
    </div>
  );
}
