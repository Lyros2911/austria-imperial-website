export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { vereinsfinanzen } from '@/lib/db/schema';
import { sql, gte, and, eq, desc } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAdminSession } from '@/lib/auth/admin';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
} from 'lucide-react';

interface SearchParams {
  year?: string;
  month?: string;
}

async function getVereinData(year: number, month: number) {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const [
    totalBalanceResult,
    monthIncomeResult,
    monthExpenseResult,
    pendingCountersignResult,
    byPersonResult,
    byCategoryResult,
    transactions,
  ] = await Promise.all([
    // Total balance (all time)
    db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)::int` })
      .from(vereinsfinanzen),

    // Month income (positive amounts)
    db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)::int` })
      .from(vereinsfinanzen)
      .where(
        and(
          gte(vereinsfinanzen.date, periodStart),
          sql`${vereinsfinanzen.date} <= ${periodEnd}`,
          sql`${vereinsfinanzen.amount} > 0`
        )
      ),

    // Month expenses (negative amounts)
    db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)::int` })
      .from(vereinsfinanzen)
      .where(
        and(
          gte(vereinsfinanzen.date, periodStart),
          sql`${vereinsfinanzen.date} <= ${periodEnd}`,
          sql`${vereinsfinanzen.amount} < 0`
        )
      ),

    // Pending countersignatures
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(vereinsfinanzen)
      .where(
        and(
          eq(vereinsfinanzen.countersignatureRequired, true),
          sql`${vereinsfinanzen.countersignedBy} IS NULL`
        )
      ),

    // By person summary (month)
    db
      .select({
        executedBy: vereinsfinanzen.executedBy,
        income: sql<number>`COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::int`,
        expense: sql<number>`COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(vereinsfinanzen)
      .where(
        and(
          gte(vereinsfinanzen.date, periodStart),
          sql`${vereinsfinanzen.date} <= ${periodEnd}`
        )
      )
      .groupBy(vereinsfinanzen.executedBy),

    // By category summary (month)
    db
      .select({
        category: vereinsfinanzen.category,
        total: sql<number>`COALESCE(SUM(amount), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(vereinsfinanzen)
      .where(
        and(
          gte(vereinsfinanzen.date, periodStart),
          sql`${vereinsfinanzen.date} <= ${periodEnd}`
        )
      )
      .groupBy(vereinsfinanzen.category),

    // Recent transactions (month)
    db
      .select()
      .from(vereinsfinanzen)
      .where(
        and(
          gte(vereinsfinanzen.date, periodStart),
          sql`${vereinsfinanzen.date} <= ${periodEnd}`
        )
      )
      .orderBy(desc(vereinsfinanzen.date))
      .limit(50),
  ]);

  return {
    totalBalance: totalBalanceResult[0]?.total ?? 0,
    monthIncome: monthIncomeResult[0]?.total ?? 0,
    monthExpense: monthExpenseResult[0]?.total ?? 0,
    pendingCountersign: pendingCountersignResult[0]?.count ?? 0,
    byPerson: byPersonResult,
    byCategory: byCategoryResult,
    transactions,
  };
}

export default async function VereinPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getAdminSession();
  const params = await searchParams;
  const now = new Date();
  const year = parseInt(params.year || String(now.getFullYear()));
  const month = parseInt(params.month || String(now.getMonth() + 1));

  const data = await getVereinData(year, month);
  const t = await getTranslations('admin');
  const locale = await getLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  const monthName = new Date(year, month - 1).toLocaleDateString(dateLocale, {
    month: 'long',
    year: 'numeric',
  });

  const categoryStyles: Record<string, string> = {
    produkte: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    reisen: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    equipment: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    dienstleistungen: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    auryx_rechnung: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    marketing: 'bg-pink-400/10 text-pink-400 border-pink-400/20',
    sonstiges: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {t('verein.title')}
          </h1>
          <p className="text-muted text-sm mt-1">{t('verein.subtitle')} — {monthName}</p>
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
                {new Date(2024, i).toLocaleDateString(dateLocale, { month: 'long' })}
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
            {t('accounting.show')}
          </button>
        </form>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label={t('verein.totalBalance')}
          value={formatEurCents(data.totalBalance)}
          icon={Wallet}
          accent={data.totalBalance >= 0 ? 'gold' : 'red'}
        />
        <KpiCard
          label={t('verein.monthIncome')}
          value={formatEurCents(data.monthIncome)}
          icon={TrendingUp}
          accent="green"
        />
        <KpiCard
          label={t('verein.monthExpense')}
          value={formatEurCents(Math.abs(data.monthExpense))}
          icon={TrendingDown}
          accent="red"
        />
        <KpiCard
          label={t('verein.pendingCountersign')}
          value={String(data.pendingCountersign)}
          icon={data.pendingCountersign > 0 ? AlertTriangle : CheckCircle2}
          accent={data.pendingCountersign > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Breakdown: By Person + By Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* By Person */}
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-sm text-muted tracking-wider uppercase mb-5">
            {t('verein.byPerson')} — {monthName}
          </h3>
          <div className="space-y-4">
            {(['gottfried', 'peter'] as const).map((person) => {
              const personData = data.byPerson.find((p) => p.executedBy === person);
              return (
                <div key={person} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-cream text-sm font-medium">
                      {t(`verein.boardMemberLabels.${person}` as any)}
                    </span>
                    <span className="text-muted text-xs">
                      {personData?.count ?? 0} Transaktionen
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400">
                      + {formatEurCents(personData?.income ?? 0)}
                    </span>
                    <span className="text-red-400">
                      {formatEurCents(personData?.expense ?? 0)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    {(personData?.income ?? 0) > 0 && (
                      <div
                        className="h-full bg-emerald-500/60 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            ((personData?.income ?? 0) /
                              Math.max(1, (personData?.income ?? 0) + Math.abs(personData?.expense ?? 0))) *
                              100
                          )}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-sm text-muted tracking-wider uppercase mb-5">
            {t('verein.byCategory')} — {monthName}
          </h3>
          {data.byCategory.length === 0 ? (
            <p className="text-muted text-sm">{t('verein.noTransactions')}</p>
          ) : (
            <div className="space-y-3">
              {data.byCategory.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                        categoryStyles[cat.category] || categoryStyles.sonstiges
                      }`}
                    >
                      {t(`verein.categoryLabels.${cat.category}` as any)}
                    </span>
                    <span className="text-muted text-xs">({cat.count})</span>
                  </div>
                  <span
                    className={`text-sm font-mono ${
                      cat.total >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatEurCents(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm text-cream font-medium">
            {t('verein.transactions')} — {monthName}
          </h3>
          {session?.role === 'admin' && (
            <a
              href={`/${locale}/admin/verein?addNew=1&year=${year}&month=${month}`}
              className="bg-gold/10 border border-gold/20 text-gold rounded-lg px-3 py-1.5 text-xs hover:bg-gold/20 transition-colors"
            >
              + {t('verein.addTransaction')}
            </a>
          )}
        </div>

        {data.transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">{t('verein.noTransactions')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('verein.date')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('verein.description')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                    {t('verein.category')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                    {t('verein.executedBy')}
                  </th>
                  <th className="text-center text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                    {t('verein.countersigned')}
                  </th>
                  <th className="text-right text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('verein.amount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => {
                  const isIncome = tx.amount > 0;
                  const needsCountersign =
                    tx.countersignatureRequired && !tx.countersignedBy;

                  return (
                    <tr
                      key={tx.id}
                      className={`border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors ${
                        needsCountersign ? 'bg-yellow-400/[0.02]' : ''
                      }`}
                    >
                      <td className="px-6 py-3.5">
                        <span className="text-cream text-sm">
                          {new Date(tx.date).toLocaleDateString(dateLocale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </span>
                        <p className="text-muted text-[10px] mt-0.5 font-mono">
                          {tx.transactionId}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-cream text-sm">{tx.description}</span>
                        {tx.isOver1000 && (
                          <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                            {t('verein.over1000')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 hidden md:table-cell">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                            categoryStyles[tx.category] || categoryStyles.sonstiges
                          }`}
                        >
                          {t(`verein.categoryLabels.${tx.category}` as any)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted hidden lg:table-cell">
                        {t(`verein.boardMemberLabels.${tx.executedBy}` as any)}
                      </td>
                      <td className="px-6 py-3.5 text-center hidden lg:table-cell">
                        {tx.countersignatureRequired ? (
                          tx.countersignedBy ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {t(`verein.boardMemberLabels.${tx.countersignedBy}` as any)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-yellow-400 text-xs">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {t('verein.pendingApproval')}
                            </span>
                          )
                        ) : (
                          <span className="text-muted/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span
                          className={`text-sm font-mono font-medium ${
                            isIncome ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isIncome ? '+' : ''}
                          {formatEurCents(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent = 'gold',
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: 'gold' | 'green' | 'red';
}) {
  const accentColors = {
    gold: 'text-gold bg-gold/[0.08] border-gold/20',
    green: 'text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20',
    red: 'text-red-400 bg-red-400/[0.08] border-red-400/20',
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
    </div>
  );
}
