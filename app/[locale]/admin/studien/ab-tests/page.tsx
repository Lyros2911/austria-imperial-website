export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { abExperiments, abEvents, orders } from '@/lib/db/schema';
import { sql, eq, and, isNotNull, notInArray } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { getAdminSession } from '@/lib/auth/admin';
import {
  Beaker,
  Users,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// ─── Chi-Squared Test fuer statistische Signifikanz ───
function chiSquaredTest(
  conversionsA: number,
  totalA: number,
  conversionsB: number,
  totalB: number
): { chiSquared: number; pValue: string; significant: boolean } {
  const total = totalA + totalB;
  const totalConversions = conversionsA + conversionsB;

  if (total === 0 || totalConversions === 0) {
    return { chiSquared: 0, pValue: 'n/a', significant: false };
  }

  const expectedA = (totalA * totalConversions) / total;
  const expectedB = (totalB * totalConversions) / total;
  const expectedNotA = totalA - expectedA;
  const expectedNotB = totalB - expectedB;

  if (expectedA === 0 || expectedB === 0 || expectedNotA === 0 || expectedNotB === 0) {
    return { chiSquared: 0, pValue: 'n/a', significant: false };
  }

  const chi =
    Math.pow(conversionsA - expectedA, 2) / expectedA +
    Math.pow(totalA - conversionsA - expectedNotA, 2) / expectedNotA +
    Math.pow(conversionsB - expectedB, 2) / expectedB +
    Math.pow(totalB - conversionsB - expectedNotB, 2) / expectedNotB;

  return {
    chiSquared: Math.round(chi * 100) / 100,
    pValue: chi > 6.63 ? 'p < 0.01' : chi > 3.84 ? 'p < 0.05' : 'nicht signifikant',
    significant: chi > 3.84,
  };
}

// ─── Daten laden ───
async function getABData() {
  // Alle Experimente
  const experiments = await db
    .select()
    .from(abExperiments)
    .orderBy(sql`created_at DESC`);

  if (experiments.length === 0) {
    return { experiments: [], funnelData: [], orderData: [] };
  }

  // Funnel-Daten: Unique Visitors pro Variante + Event-Typ
  const funnelData = await db.execute(sql`
    SELECT
      e.experiment_id,
      e.variant,
      e.event_type,
      COUNT(DISTINCT e.visitor_id)::int as unique_visitors,
      COUNT(*)::int as total_events
    FROM ab_events e
    GROUP BY e.experiment_id, e.variant, e.event_type
    ORDER BY e.experiment_id, e.variant, e.event_type
  `);

  // Order-Daten nach AB-Variante
  const orderData = await db.execute(sql`
    SELECT
      ab_experiment_slug as experiment_slug,
      ab_variant as variant,
      COUNT(*)::int as order_count,
      COALESCE(SUM(total_cents), 0)::int as total_revenue_cents,
      COALESCE(AVG(total_cents), 0)::int as avg_order_cents
    FROM orders
    WHERE ab_variant IS NOT NULL
      AND ab_experiment_slug IS NOT NULL
      AND status NOT IN ('cancelled', 'refunded')
    GROUP BY ab_experiment_slug, ab_variant
  `);

  return { experiments, funnelData: funnelData.rows, orderData: orderData.rows };
}

export default async function ABTestsPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const t = await getTranslations('admin.studien.abTests');
  const { experiments, funnelData, orderData } = await getABData();

  if (experiments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
          {t('title')}
        </h1>
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-12 text-center">
          <Beaker className="w-10 h-10 text-muted mx-auto mb-4" />
          <p className="text-muted">{t('noExperiments')}</p>
        </div>
      </div>
    );
  }

  // Erstes Experiment (aktives) anzeigen
  const experiment = experiments[0];

  // Funnel fuer dieses Experiment aufbereiten
  const eventTypes = ['page_view', 'avatar_impression', 'add_to_cart', 'checkout_start', 'purchase'] as const;

  type FunnelRow = { experiment_id: number; variant: string; event_type: string; unique_visitors: number };
  const experimentFunnel = (funnelData as FunnelRow[]).filter(
    (r) => r.experiment_id === experiment.id
  );

  const getFunnelCount = (variant: string, eventType: string): number => {
    const row = experimentFunnel.find(
      (r) => r.variant === variant && r.event_type === eventType
    );
    return row?.unique_visitors ?? 0;
  };

  const visitorsA = getFunnelCount('A', 'page_view');
  const visitorsB = getFunnelCount('B', 'page_view');
  const purchasesA = getFunnelCount('A', 'purchase');
  const purchasesB = getFunnelCount('B', 'purchase');

  type OrderRow = { experiment_slug: string; variant: string; order_count: number; total_revenue_cents: number; avg_order_cents: number };
  const orderA = (orderData as OrderRow[]).find(
    (r) => r.experiment_slug === experiment.slug && r.variant === 'A'
  );
  const orderB = (orderData as OrderRow[]).find(
    (r) => r.experiment_slug === experiment.slug && r.variant === 'B'
  );

  const conversionA = visitorsA > 0 ? (purchasesA / visitorsA) * 100 : 0;
  const conversionB = visitorsB > 0 ? (purchasesB / visitorsB) * 100 : 0;

  const significance = chiSquaredTest(purchasesA, visitorsA, purchasesB, visitorsB);

  const statusColors: Record<string, string> = {
    draft: 'bg-white/10 text-muted',
    running: 'bg-green-900/30 text-green-400',
    paused: 'bg-yellow-900/30 text-yellow-400',
    completed: 'bg-blue-900/30 text-blue-400',
  };

  const eventLabels: Record<string, string> = {
    page_view: t('pageViews'),
    avatar_impression: t('avatarImpressions'),
    add_to_cart: t('addToCart'),
    checkout_start: t('checkoutStart'),
    purchase: t('purchases'),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {t('title')}
          </h1>
          <p className="text-muted text-sm mt-1">{t('subtitle')}</p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[experiment.status]}`}
        >
          {experiment.status.toUpperCase()}
        </span>
      </div>

      {/* Experiment Info */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Beaker className="w-4 h-4 text-gold" />
          <h2 className="text-cream font-medium text-sm">{experiment.name}</h2>
        </div>
        {experiment.description && (
          <p className="text-muted text-xs leading-relaxed">{experiment.description}</p>
        )}
        <div className="flex gap-6 mt-3 text-xs text-muted">
          <span>
            {t('variantA')}: <strong className="text-gold">{experiment.variantAName}</strong>
          </span>
          <span>
            {t('variantB')}: <strong className="text-cream">{experiment.variantBName}</strong>
          </span>
          <span>Traffic: {experiment.trafficPercent}% / {100 - experiment.trafficPercent}%</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label={t('totalVisitors')}
          value={`${visitorsA + visitorsB}`}
          detail={`A: ${visitorsA} | B: ${visitorsB}`}
        />
        <KPICard
          icon={TrendingUp}
          label={t('conversionRate')}
          value={`${conversionA.toFixed(1)}% / ${conversionB.toFixed(1)}%`}
          detail={`A: ${purchasesA} Käufe | B: ${purchasesB} Käufe`}
          highlight={conversionA > conversionB}
        />
        <KPICard
          icon={ShoppingCart}
          label={t('revenueByVariant')}
          value={`${formatEurCents(orderA?.total_revenue_cents ?? 0)} / ${formatEurCents(orderB?.total_revenue_cents ?? 0)}`}
          detail={`A: ${orderA?.order_count ?? 0} | B: ${orderB?.order_count ?? 0} Bestellungen`}
        />
        <KPICard
          icon={significance.significant ? CheckCircle2 : AlertCircle}
          label={t('significance')}
          value={significance.pValue}
          detail={`χ² = ${significance.chiSquared}`}
          highlight={significance.significant}
        />
      </div>

      {/* Conversion Funnel */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6">
        <h3 className="font-[var(--font-heading)] text-lg text-cream font-semibold mb-6">
          {t('funnel')}
        </h3>

        <div className="space-y-4">
          {eventTypes.map((eventType) => {
            const countA = getFunnelCount('A', eventType);
            const countB = getFunnelCount('B', eventType);
            const maxCount = Math.max(countA, countB, 1);

            return (
              <div key={eventType} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted w-32">{eventLabels[eventType]}</span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-gold">A: {countA}</span>
                    <span className="text-cream/60">B: {countB}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {/* Variante A bar */}
                  <div className="h-5 bg-white/[0.03] rounded overflow-hidden">
                    <div
                      className="h-full bg-gold/30 rounded transition-all duration-500"
                      style={{ width: `${(countA / maxCount) * 100}%` }}
                    />
                  </div>
                  {/* Variante B bar */}
                  <div className="h-5 bg-white/[0.03] rounded overflow-hidden">
                    <div
                      className="h-full bg-white/10 rounded transition-all duration-500"
                      style={{ width: `${(countB / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legende */}
        <div className="flex gap-6 mt-6 pt-4 border-t border-white/[0.06] text-xs text-muted">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gold/30 rounded" />
            <span>{t('variantA')} ({experiment.variantAName})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white/10 rounded" />
            <span>{t('variantB')} ({experiment.variantBName})</span>
          </div>
        </div>
      </div>

      {/* Studien-Hinweis */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <p className="text-muted text-xs leading-relaxed">
          {t('studyNotice')}
        </p>
      </div>
    </div>
  );
}

// ─── KPI Card Komponente ───
function KPICard({
  icon: Icon,
  label,
  value,
  detail,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${highlight ? 'text-green-400' : 'text-gold/60'}`} />
        <span className="text-muted text-xs">{label}</span>
      </div>
      <p className={`font-[var(--font-heading)] text-xl font-semibold ${highlight ? 'text-green-400' : 'text-cream'}`}>
        {value}
      </p>
      <p className="text-muted/60 text-[11px]">{detail}</p>
    </div>
  );
}
