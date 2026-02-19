export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { financialLedger } from '@/lib/db/schema';
import { sql, gte, lte, and, desc } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Download, BookOpen } from 'lucide-react';

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

  // Build CSV export URL
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
          Zurück zu Accounting
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-gold" />
              Financial Ledger
            </h1>
            <p className="text-muted text-sm mt-1">
              {data.total} Einträge · Append-Only
            </p>
          </div>

          <a
            href={csvUrl}
            className="flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold rounded-lg px-4 py-2 text-sm hover:bg-gold/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Export
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
          Filtern
        </button>
        {(params.from || params.to) && (
          <Link
            href="/admin/accounting/ledger"
            className="text-muted text-sm hover:text-cream px-3 py-2 transition-colors"
          >
            Zurücksetzen
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        {data.entries.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <BookOpen className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">Keine Ledger-Einträge gefunden</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      Datum
                    </th>
                    <th className="text-left text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      Order
                    </th>
                    <th className="text-left text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      Typ
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      Umsatz
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      Prod.kosten
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5 hidden lg:table-cell">
                      Versand
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5 hidden lg:table-cell">
                      Stripe Fee
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      Gewinn
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      Peter
                    </th>
                    <th className="text-right text-[9px] text-muted uppercase tracking-wider px-4 py-2.5">
                      AIGG
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
                          {new Date(entry.createdAt).toLocaleDateString('de-AT', {
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
                  Seite {data.page} von {data.totalPages}
                </p>
                <div className="flex gap-2">
                  {data.page > 1 && (
                    <Link
                      href={`/admin/accounting/ledger?page=${data.page - 1}${params.from ? `&from=${params.from}` : ''}${params.to ? `&to=${params.to}` : ''}`}
                      className="px-3 py-1.5 text-[10px] text-muted hover:text-cream border border-white/[0.08] rounded transition-colors"
                    >
                      ← Zurück
                    </Link>
                  )}
                  {data.page < data.totalPages && (
                    <Link
                      href={`/admin/accounting/ledger?page=${data.page + 1}${params.from ? `&from=${params.from}` : ''}${params.to ? `&to=${params.to}` : ''}`}
                      className="px-3 py-1.5 text-[10px] text-muted hover:text-cream border border-white/[0.08] rounded transition-colors"
                    >
                      Weiter →
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
