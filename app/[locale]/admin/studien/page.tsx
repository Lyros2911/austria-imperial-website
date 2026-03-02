export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { studyReports } from '@/lib/db/schema';
import { sql, eq, desc } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAdminSession } from '@/lib/auth/admin';
import {
  FileText,
  CheckCircle2,
  Clock,
  ExternalLink,
  BarChart3,
  ShoppingCart,
} from 'lucide-react';

async function getStudienData() {
  const [totalResult, publishedResult, reports] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(studyReports),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(studyReports)
      .where(eq(studyReports.status, 'published')),
    db
      .select()
      .from(studyReports)
      .orderBy(desc(studyReports.periodTo))
      .limit(50),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    published: publishedResult[0]?.count ?? 0,
    reports,
  };
}

export default async function StudienPage() {
  const session = await getAdminSession();
  const data = await getStudienData();
  const t = await getTranslations('admin');
  const locale = await getLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  const typeStyles: Record<string, string> = {
    weekly: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    monthly: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    quarterly: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    yearly: 'bg-gold/10 text-gold border-gold/20',
  };

  const statusStyles: Record<string, string> = {
    draft: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    final: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    published: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {t('studien.title')}
          </h1>
          <p className="text-muted text-sm mt-1">{t('studien.subtitle')}</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <p className="text-muted text-xs tracking-wider uppercase">{t('studien.totalReports')}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-blue-400 bg-blue-400/[0.08] border-blue-400/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {data.total}
          </p>
        </div>
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <p className="text-muted text-xs tracking-wider uppercase">{t('studien.publishedReports')}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {data.published}
          </p>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm text-cream font-medium">
            {t('studien.title')}
          </h3>
        </div>

        {data.reports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">{t('studien.noReports')}</p>
            <p className="text-muted/50 text-xs mt-2">
              Berichte werden automatisch von n8n-Workflows generiert
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('studien.reportId')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('studien.type')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                    {t('studien.period')}
                  </th>
                  <th className="text-right text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                    {t('studien.revenue')}
                  </th>
                  <th className="text-right text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                    {t('studien.orders')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('studien.status')}
                  </th>
                  <th className="text-center text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                    {t('studien.pdf')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <span className="text-cream text-sm font-mono font-medium">
                        {report.reportId}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                          typeStyles[report.type] || typeStyles.weekly
                        }`}
                      >
                        {t(`studien.typeLabels.${report.type}` as any)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted text-xs hidden md:table-cell">
                      {new Date(report.periodFrom).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: '2-digit',
                      })}{' '}
                      —{' '}
                      {new Date(report.periodTo).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-right hidden lg:table-cell">
                      {report.totalRevenue != null ? (
                        <span className="text-cream text-sm font-mono">
                          {formatEurCents(report.totalRevenue)}
                        </span>
                      ) : (
                        <span className="text-muted/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right hidden lg:table-cell">
                      {report.orderCount != null ? (
                        <span className="text-cream text-sm">{report.orderCount}</span>
                      ) : (
                        <span className="text-muted/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                          statusStyles[report.status] || statusStyles.draft
                        }`}
                      >
                        {t(`studien.statusLabels.${report.status}` as any)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center hidden sm:table-cell">
                      {report.pdfUrl ? (
                        <a
                          href={report.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-gold text-xs hover:text-gold-light transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-muted/40 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Details (expandable cards for reports with summary) */}
      {data.reports.filter((r) => r.aiSummary).length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-sm text-muted tracking-wider uppercase">
            {t('studien.summary')}
          </h3>
          {data.reports
            .filter((r) => r.aiSummary)
            .slice(0, 3)
            .map((report) => (
              <div
                key={report.id}
                className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-cream text-sm font-mono font-medium">
                    {report.reportId}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                      typeStyles[report.type] || typeStyles.weekly
                    }`}
                  >
                    {t(`studien.typeLabels.${report.type}` as any)}
                  </span>
                </div>
                <p className="text-muted text-sm leading-relaxed">{report.aiSummary}</p>
                {(report.totalRevenue != null || report.orderCount != null) && (
                  <div className="flex gap-4 mt-4 pt-3 border-t border-white/[0.04]">
                    {report.totalRevenue != null && (
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-gold" />
                        <span className="text-cream text-xs font-mono">
                          {formatEurCents(report.totalRevenue)}
                        </span>
                      </div>
                    )}
                    {report.orderCount != null && (
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-cream text-xs">
                          {report.orderCount} {t('studien.orders')}
                        </span>
                      </div>
                    )}
                    {report.averageOrderValue != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted text-xs">
                          {t('studien.avgOrderValue')}: {formatEurCents(report.averageOrderValue)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
