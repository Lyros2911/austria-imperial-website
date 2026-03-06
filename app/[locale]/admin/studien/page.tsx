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
  Download,
  Globe,
  Zap,
  TrendingUp,
} from 'lucide-react';

interface PlatformMetric {
  platform: string;
  orders: number;
  revenueCents: number;
  avgOrderCents: number;
  revenueShare: number;
}

interface ContentMetrics {
  byPlatform: PlatformMetric[];
  byContent: { contentId: string | null; campaign: string | null; platform: string; orders: number; revenueCents: number }[];
  auryxEngineOrders: number;
  auryxEngineRevenue: number;
  directOrders: number;
  directRevenue: number;
}

interface LanguageData {
  orders: number;
  revenueCents: number;
  avgOrderCents: number;
  revenueShare: number;
}

const platformColors: Record<string, string> = {
  instagram: 'bg-pink-500',
  youtube: 'bg-red-500',
  tiktok: 'bg-cyan-400',
  facebook: 'bg-blue-500',
  twitter: 'bg-sky-400',
  linkedin: 'bg-blue-600',
  google: 'bg-yellow-500',
  email: 'bg-emerald-500',
  direct: 'bg-white/20',
};

const langLabels: Record<string, string> = {
  de: 'Deutsch',
  en: 'English',
  ar: 'العربية',
  fr: 'Français',
  it: 'Italiano',
  es: 'Español',
  tr: 'Türkçe',
  ru: 'Русский',
};

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

  // Get latest report with contentMetrics for the overview cards
  const latestWithMetrics = data.reports.find((r) => r.contentMetrics != null);
  const metrics = latestWithMetrics?.contentMetrics as ContentMetrics | null;
  const langData = latestWithMetrics?.dataByLanguage as Record<string, LanguageData> | null;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        {metrics && (
          <>
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <p className="text-muted text-xs tracking-wider uppercase">{t('studien.auryxEngine')}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-gold bg-gold/[0.08] border-gold/20">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <p className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
                {formatEurCents(metrics.auryxEngineRevenue)}
              </p>
              <p className="text-muted text-xs mt-1">
                {metrics.auryxEngineOrders} {t('studien.orders')}
              </p>
            </div>
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <p className="text-muted text-xs tracking-wider uppercase">{t('studien.platforms')}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-purple-400 bg-purple-400/[0.08] border-purple-400/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
                {metrics.byPlatform.filter((p) => p.platform !== 'direct').length}
              </p>
              <p className="text-muted text-xs mt-1">{t('studien.activePlatforms')}</p>
            </div>
          </>
        )}
      </div>

      {/* Platform Performance + Language Breakdown (side by side) */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Platform Performance */}
          <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6">
            <h3 className="text-sm text-cream font-medium mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gold" />
              {t('studien.platformPerformance')}
            </h3>
            {metrics.byPlatform.length === 0 ? (
              <p className="text-muted text-xs">{t('studien.noData')}</p>
            ) : (
              <div className="space-y-3">
                {metrics.byPlatform.map((p) => (
                  <div key={p.platform}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cream text-xs font-medium capitalize">
                        {p.platform}
                      </span>
                      <span className="text-muted text-xs">
                        {formatEurCents(p.revenueCents)} · {p.orders} {t('studien.orders')} · {p.revenueShare}%
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.04] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${platformColors[p.platform] ?? 'bg-gold'}`}
                        style={{ width: `${Math.max(p.revenueShare, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Language Breakdown */}
          <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-6">
            <h3 className="text-sm text-cream font-medium mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              {t('studien.languageBreakdown')}
            </h3>
            {!langData || Object.keys(langData).length === 0 ? (
              <p className="text-muted text-xs">{t('studien.noData')}</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(langData)
                  .sort(([, a], [, b]) => b.revenueCents - a.revenueCents)
                  .map(([lang, d]) => (
                    <div key={lang}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-cream text-xs font-medium">
                          {langLabels[lang] ?? lang.toUpperCase()}
                        </span>
                        <span className="text-muted text-xs">
                          {formatEurCents(d.revenueCents)} · {d.orders} {t('studien.orders')} · {d.revenueShare}%
                        </span>
                      </div>
                      <div className="w-full bg-white/[0.04] rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-400"
                          style={{ width: `${Math.max(d.revenueShare, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                    {t('studien.export')}
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
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={`/api/admin/studien/${report.id}/export?format=csv`}
                          className="inline-flex items-center gap-1 text-gold text-xs hover:text-gold-light transition-colors"
                          title="CSV Export"
                        >
                          <Download className="w-3.5 h-3.5" />
                          CSV
                        </a>
                        <a
                          href={`/api/admin/studien/${report.id}/export?format=json`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 text-xs hover:text-blue-300 transition-colors"
                          title="JSON Export"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          JSON
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Details with Attribution Insights */}
      {data.reports.filter((r) => r.aiSummary).length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-sm text-muted tracking-wider uppercase">
            {t('studien.summary')}
          </h3>
          {data.reports
            .filter((r) => r.aiSummary)
            .slice(0, 5)
            .map((report) => {
              const rm = report.contentMetrics as ContentMetrics | null;
              const rl = report.dataByLanguage as Record<string, LanguageData> | null;

              return (
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

                  {/* KPI Row */}
                  {(report.totalRevenue != null || report.orderCount != null) && (
                    <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-white/[0.04]">
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

                  {/* Inline Platform Breakdown for this report */}
                  {rm?.byPlatform && rm.byPlatform.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                      <p className="text-muted text-[10px] uppercase tracking-wider mb-2">
                        {t('studien.platformPerformance')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {rm.byPlatform.map((p) => (
                          <span
                            key={p.platform}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-xs"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${platformColors[p.platform] ?? 'bg-gold'}`}
                            />
                            <span className="text-cream capitalize">{p.platform}</span>
                            <span className="text-muted">
                              {formatEurCents(p.revenueCents)} · {p.revenueShare}%
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Language Tags */}
                  {rl && Object.keys(rl).length > 1 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                      <p className="text-muted text-[10px] uppercase tracking-wider mb-2">
                        {t('studien.languageBreakdown')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(rl)
                          .sort(([, a], [, b]) => b.revenueCents - a.revenueCents)
                          .map(([lang, d]) => (
                            <span
                              key={lang}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-xs"
                            >
                              <Globe className="w-3 h-3 text-blue-400" />
                              <span className="text-cream">{langLabels[lang] ?? lang.toUpperCase()}</span>
                              <span className="text-muted">
                                {formatEurCents(d.revenueCents)} · {d.revenueShare}%
                              </span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
