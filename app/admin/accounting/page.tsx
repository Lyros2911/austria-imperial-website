export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { financialLedger } from '@/lib/db/schema';
import { sql, gte, lte, and } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  ArrowDown,
  DollarSign,
  Users,
  Building,
} from 'lucide-react';

interface SearchParams {
  year?: string;
  month?: string;
}

async function getAccountingData(year: number, month: number) {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  // Monthly aggregation
  const [monthlyResult] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(revenue_cents), 0)::int`,
      producerCost: sql<number>`COALESCE(SUM(producer_cost_cents), 0)::int`,
      packaging: sql<number>`COALESCE(SUM(packaging_cents), 0)::int`,
      shipping: sql<number>`COALESCE(SUM(shipping_cost_cents), 0)::int`,
      paymentFee: sql<number>`COALESCE(SUM(payment_fee_cents), 0)::int`,
      customs: sql<number>`COALESCE(SUM(customs_cents), 0)::int`,
      grossProfit: sql<number>`COALESCE(SUM(gross_profit_cents), 0)::int`,
      auryxShare: sql<number>`COALESCE(SUM(auryx_share_cents), 0)::int`,
      peterShare: sql<number>`COALESCE(SUM(peter_share_cents), 0)::int`,
      aiggShare: sql<number>`COALESCE(SUM(aigg_share_cents), 0)::int`,
      count: sql<number>`count(*)::int`,
      salesCount: sql<number>`count(*) FILTER (WHERE entry_type = 'sale')::int`,
      refundCount: sql<number>`count(*) FILTER (WHERE entry_type IN ('partial_refund', 'full_refund'))::int`,
    })
    .from(financialLedger)
    .where(
      and(
        gte(financialLedger.createdAt, periodStart),
        lte(financialLedger.createdAt, periodEnd)
      )
    );

  // Year-to-date aggregation
  const yearStart = new Date(year, 0, 1);
  const [ytdResult] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(revenue_cents), 0)::int`,
      grossProfit: sql<number>`COALESCE(SUM(gross_profit_cents), 0)::int`,
      auryxShare: sql<number>`COALESCE(SUM(auryx_share_cents), 0)::int`,
      peterShare: sql<number>`COALESCE(SUM(peter_share_cents), 0)::int`,
      aiggShare: sql<number>`COALESCE(SUM(aigg_share_cents), 0)::int`,
    })
    .from(financialLedger)
    .where(
      and(
        gte(financialLedger.createdAt, yearStart),
        lte(financialLedger.createdAt, periodEnd)
      )
    );

  return { monthly: monthlyResult, ytd: ytdResult };
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = parseInt(params.year || String(now.getFullYear()));
  const month = parseInt(params.month || String(now.getMonth() + 1));

  const data = await getAccountingData(year, month);
  const m = data.monthly;
  const ytd = data.ytd;

  const monthName = new Date(year, month - 1).toLocaleDateString('de-AT', {
    month: 'long',
    year: 'numeric',
  });

  const totalCosts =
    m.producerCost + m.packaging + m.shipping + m.paymentFee + m.customs;
  const margin = m.revenue > 0 ? ((m.grossProfit / m.revenue) * 100).toFixed(1) : '0.0';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            Accounting
          </h1>
          <p className="text-muted text-sm mt-1">{monthName}</p>
        </div>

        {/* Period selector */}
        <form className="flex gap-2" method="GET">
          <select
            name="month"
            defaultValue={month}
            className="bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleDateString('de-AT', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            name="year"
            defaultValue={year}
            className="bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-gold/10 border border-gold/20 text-gold rounded-lg px-4 py-2 text-sm hover:bg-gold/20 transition-colors"
          >
            Anzeigen
          </button>
        </form>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Umsatz"
          value={formatEurCents(m.revenue)}
          icon={DollarSign}
          accent="gold"
        />
        <KpiCard
          label="Bruttogewinn"
          value={formatEurCents(m.grossProfit)}
          sub={`Marge: ${margin}%`}
          icon={TrendingUp}
          accent="green"
        />
        <KpiCard
          label="Peter (50%)"
          value={formatEurCents(m.peterShare)}
          icon={Users}
          accent="gold"
        />
        <KpiCard
          label="Gottfried (50%)"
          value={formatEurCents(m.aiggShare)}
          icon={Building}
          accent="green"
        />
      </div>

      {/* P&L Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Cost Breakdown */}
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-sm text-muted tracking-wider uppercase mb-5">
            Kostenaufstellung {monthName}
          </h3>
          <div className="space-y-3">
            <CostRow label="Umsatz (Brutto)" value={m.revenue} bold accent="cream" />
            <div className="border-t border-white/[0.06] my-2" />
            <CostRow label="Produzentenkosten" value={-m.producerCost} />
            <CostRow label="Verpackung" value={-m.packaging} />
            <CostRow label="Versand" value={-m.shipping} />
            <CostRow label="Zahlungsgebühren (Stripe)" value={-m.paymentFee} />
            <CostRow label="Zoll" value={-m.customs} />
            <div className="border-t border-white/[0.06] my-2" />
            <CostRow label="Gesamtkosten" value={-totalCosts} bold />
            <div className="border-t border-gold/20 my-2" />
            <CostRow label="Bruttogewinn" value={m.grossProfit} bold accent="gold" />
            <div className="border-t border-white/[0.06] my-2" />
            <CostRow label="→ Auryx AI (10% D2C)" value={m.auryxShare} accent="cream" />
            <CostRow label="→ Peter (50% Rest)" value={m.peterShare} accent="gold" />
            <CostRow label="→ Gottfried (50% Rest)" value={m.aiggShare} accent="emerald" />
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.04]">
            <p className="text-muted text-[10px]">
              {m.salesCount} Verkäufe · {m.refundCount} Erstattungen · {m.count} Buchungen
            </p>
          </div>
        </div>

        {/* YTD Summary */}
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-sm text-muted tracking-wider uppercase mb-5">
            Year-to-Date ({year})
          </h3>
          <div className="space-y-3">
            <CostRow label="Gesamtumsatz YTD" value={ytd.revenue} bold accent="cream" />
            <CostRow label="Bruttogewinn YTD" value={ytd.grossProfit} bold accent="gold" />
            <div className="border-t border-white/[0.06] my-2" />
            <CostRow label="Auryx AI YTD" value={ytd.auryxShare} accent="cream" />
            <CostRow label="Peter YTD" value={ytd.peterShare} accent="gold" />
            <CostRow label="Gottfried YTD" value={ytd.aiggShare} accent="emerald" />
          </div>

          <div className="mt-8 flex gap-3">
            <Link
              href="/admin/accounting/ledger"
              className="flex-1 text-center bg-gold/10 border border-gold/20 text-gold rounded-lg px-4 py-2.5 text-sm hover:bg-gold/20 transition-colors"
            >
              Ledger ansehen
            </Link>
            <Link
              href="/admin/accounting/reports"
              className="flex-1 text-center bg-white/[0.04] border border-white/[0.08] text-cream rounded-lg px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors"
            >
              Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: 'gold' | 'green';
}) {
  const accentClasses =
    accent === 'gold'
      ? 'text-gold bg-gold/[0.08] border-gold/20'
      : 'text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20';

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-muted text-[10px] tracking-wider uppercase">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${accentClasses}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="font-[var(--font-heading)] text-xl text-cream font-semibold">{value}</p>
      {sub && <p className="text-muted text-[10px] mt-1">{sub}</p>}
    </div>
  );
}

function CostRow({
  label,
  value,
  bold = false,
  accent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  accent?: 'cream' | 'gold' | 'emerald';
}) {
  const textColor = accent
    ? accent === 'gold'
      ? 'text-gold'
      : accent === 'emerald'
        ? 'text-emerald-400'
        : 'text-cream'
    : value < 0
      ? 'text-red-400/80'
      : 'text-muted';

  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'text-cream font-medium' : 'text-muted'}`}>
        {label}
      </span>
      <span className={`text-sm font-mono ${bold ? 'font-medium' : ''} ${textColor}`}>
        {formatEurCents(value)}
      </span>
    </div>
  );
}
