export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { vereinsmitglieder } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAdminSession } from '@/lib/auth/admin';
import {
  Users,
  UserCheck,
  Clock,
} from 'lucide-react';

async function getMitgliederData() {
  const [totalResult, activeResult, members] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(vereinsmitglieder),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(vereinsmitglieder)
      .where(eq(vereinsmitglieder.status, 'aktiv')),
    db
      .select()
      .from(vereinsmitglieder)
      .orderBy(vereinsmitglieder.memberNumber),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    active: activeResult[0]?.count ?? 0,
    members,
  };
}

export default async function MitgliederPage() {
  const session = await getAdminSession();
  const data = await getMitgliederData();
  const t = await getTranslations('admin');
  const locale = await getLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  const categoryStyles: Record<string, string> = {
    ordentlich: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    foerder: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    ausserordentlich: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    ehren: 'bg-gold/10 text-gold border-gold/20',
  };

  const statusStyles: Record<string, string> = {
    aktiv: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    ehemalig: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {t('mitglieder.title')}
          </h1>
          <p className="text-muted text-sm mt-1">{t('mitglieder.subtitle')}</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <p className="text-muted text-xs tracking-wider uppercase">{t('mitglieder.totalMembers')}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-blue-400 bg-blue-400/[0.08] border-blue-400/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {data.total}
          </p>
        </div>
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <p className="text-muted text-xs tracking-wider uppercase">{t('mitglieder.activeMembers')}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-emerald-400 bg-emerald-400/[0.08] border-emerald-400/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {data.active}
          </p>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm text-cream font-medium">
            {t('mitglieder.title')}
          </h3>
        </div>

        {data.members.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Clock className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">{t('mitglieder.noMembers')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('mitglieder.memberNumber')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('mitglieder.name')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                    {t('mitglieder.email')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('mitglieder.category')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                    {t('mitglieder.joinDate')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3">
                    {t('mitglieder.status')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-6 py-3 hidden xl:table-cell">
                    {t('mitglieder.dataOrigin')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <span className="text-gold text-sm font-mono font-medium">
                        {member.memberNumber}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-cream text-sm">
                        {member.firstName} {member.lastName}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted text-sm hidden md:table-cell">
                      {member.email}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                          categoryStyles[member.category] || categoryStyles.ordentlich
                        }`}
                      >
                        {t(`mitglieder.categoryLabels.${member.category}` as any)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted text-xs hidden lg:table-cell">
                      {new Date(member.joinDate).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded text-[10px] font-medium border ${
                          statusStyles[member.status] || statusStyles.aktiv
                        }`}
                      >
                        {t(`mitglieder.statusLabels.${member.status}` as any)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted text-xs hidden xl:table-cell">
                      {member.dataOrigin || '—'}
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
