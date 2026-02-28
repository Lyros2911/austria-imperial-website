export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { financialLedger } from '@/lib/db/schema';
import { sql, gte, lte, and, desc } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Download, BookOpen } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';

interface SearchParams {
  page?: string;
  from?: string;
  to?: string;
}

const PAGE_SIZE = 50;

async function getLedgerData(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page || '1'));
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];

  if (params.from) {
    conditions.push(gte(financialLedger.createdAt, new Date(params.from)));
  }
  if (params.to) {
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(financialLedger.createdAt, toDate));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, countResult] = await Promise.all([
    db.query.financialLedger.findMany({
      where,
      orderBy: (l, { desc: d }) => [d(l.createdAt)],
      limit: PAGE_SIZE,
      offset,
      with: {
        order: true,
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(financialLedger)
      .where(where),
  ]);

  return {
    entries,
    total: countResult[0]?.count ?? 0,
    page,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / PAGE_SIZE),
  };
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = await getLedgerData(params);

  const t = await getTranslations('admin');
  const locale = await getLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  // Build CSV export URL — no locale prefix for API routes
  const csvParams = new URLSearchParams();
  if (params.from) csvParams.set('from', params.from);
  if (params.to) csvParams.set('to', params.to);
  const csvUrl = `/api/admin/ledger/csv${csvParams.toString() ? '?' + csvParams.toString() : ''}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/accounting"
          className="inline-flex items-center gap-1.5 text-muted text-xs hover:text-cream transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('ledger.backToAccounting')}
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-gold" />
              {t('ledger.title')}
            </h1>
            <p className="text-muted text-sm mt-1">
              {t('ledger.entriesCount', { count: data.total })}
            </p>
          </div>

          <a
            href={csvUrl}
            className="flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold rounded-lg px-4 py-2 text-sm hover:bg-gold/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {t('ledger.csvExport')}
          </a>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6" method="GET">
        <input
          type="date"
          name="from"
          defaultValue={params.from || ''}
          className="bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
        />
        <input
          type="date"
          name="to"
          defaultValue={params.to || ''}
          className="bg-[#0e0e0e] border border-white/[0.08] rounded-lg px-3 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-white/[0.04] border border-white/[0.08] text-cream rounded-lg px-4 py-2 text-sm hover:bg-white/[0.06] transition-colors"
        >
          {t('ledger.filter')}
        </button>
        {(params.from || params.to) && (
          <Link
            href="/admin/accounting/ledger"
            className="text-muted text-sm hover:text-cream px-3 py-2 transition-colors"
          >
            {t('ledger.reset')}
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        {data.entries.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <BookOpen className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">{t('ledger.noEntries')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      {t('ledger.date')}
                    </th>
                    <th className="text-left text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      {t('ledger.order')}
                    </th>
                    <th className="text-left text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      {t('ledger.type')}
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      {t('ledger.revenue')}
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      {t('ledger.producerCosts')}
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5 hidden lg:table-cell">
                      {t('ledger.shipping')}
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5 hidden lg:table-cell">
                      {t('ledger.stripeFee')}
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      {t('ledger.profit')}
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5 hidden xl:table-cell">
                      {t('ledger.auryx')}
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      {t('ledger.peter')}
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      {t('ledger.gottfried')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => {
                    const isRefund = entry.entryType.includes('refund');
                    const rowClass = isRefund ? 'text-red-400' : '';

                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors"
                      >
                        <td className="px-4 py-2.5 text-muted">
                          {new Date(entry.createdAt).toLocaleDateString(dateLocale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/admin/orders/${entry.orderId}`}
                            className="text-cream hover:text-gold transition-colors"
                          >
                            {entry.order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`capitalize ${rowClass || 'text-cream'}`}>
                            {entry.entryType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono ${rowClass || 'text-cream'}`}>
                          {formatEurCents(entry.revenueCents)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted">
                          {formatEurCents(entry.producerCostCents)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted hidden lg:table-cell">
                          {formatEurCents(entry.shippingCostCents)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted hidden lg:table-cell">
                          {formatEurCents(entry.paymentFeeCents)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono font-medium ${
                          isRefund ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {formatEurCents(entry.grossProfitCents)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono hidden xl:table-cell ${rowClass || 'text-blue-400'}`}>
                          {formatEurCents((entry as any).auryxShareCents ?? 0)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono ${rowClass || 'text-gold'}`}>
                          {formatEurCents(entry.peterShareCents)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono ${rowClass || 'text-cream'}`}>
                          {formatEurCents(entry.aiggShareCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                <p className="text-muted text-[10px]">
                  {t('ledger.page')} {data.page} {t('ledger.of')} {data.totalPages}
                </p>
                <div className="flex gap-2">
                  {data.page > 1 && (
                    <Link
                      href={`/admin/accounting/ledger?page=${data.page - 1}${params.from ? `&from=${params.from}` : ''}${params.to ? `&to=${params.to}` : ''}`}
                      className="px-3 py-1.5 text-[10px] text-muted hover:text-cream border border-white/[0.08] rounded transition-colors"
                    >
                      ← {t('ledger.previous')}
                    </Link>
                  )}
                  {data.page < data.totalPages && (
                    <Link
                      href={`/admin/accounting/ledger?page=${data.page + 1}${params.from ? `&from=${params.from}` : ''}${params.to ? `&to=${params.to}` : ''}`}
                      className="px-3 py-1.5 text-[10px] text-muted hover:text-cream border border-white/[0.08] rounded transition-colors"
                    >
                      {t('ledger.next')} →
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
