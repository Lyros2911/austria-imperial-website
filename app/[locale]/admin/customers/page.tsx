export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { customers, orders } from '@/lib/db/schema';
import { desc, eq, sql, and, isNull, isNotNull } from 'drizzle-orm';
import { formatEurCents } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { Users, UserCheck, UserX, ShoppingBag } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';

interface CustomerRow {
  email: string;
  name: string | null;
  type: 'account' | 'guest';
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: Date | null;
}

async function getCustomerOverview(): Promise<{
  customers: CustomerRow[];
  stats: { total: number; registered: number; guests: number; totalRevenueCents: number };
}> {
  // 1. Registered customers with order stats
  const registered = await db
    .select({
      email: customers.email,
      name: customers.name,
      orderCount: sql<number>`count(${orders.id})::int`,
      totalSpentCents: sql<number>`COALESCE(sum(${orders.totalCents}), 0)::int`,
      lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(isNull(customers.deletedAt))
    .groupBy(customers.id, customers.email, customers.name);

  // 2. Guest customers aggregated by guestEmail (where no customerId)
  const guests = await db
    .select({
      email: orders.guestEmail,
      name: sql<string | null>`MAX(${orders.shippingName})`,
      orderCount: sql<number>`count(*)::int`,
      totalSpentCents: sql<number>`COALESCE(sum(${orders.totalCents}), 0)::int`,
      lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
    })
    .from(orders)
    .where(and(isNull(orders.customerId), isNotNull(orders.guestEmail)))
    .groupBy(orders.guestEmail);

  // Merge & sort by lastOrderAt desc
  const all: CustomerRow[] = [
    ...registered.map((r) => ({
      email: r.email,
      name: r.name,
      type: 'account' as const,
      orderCount: r.orderCount,
      totalSpentCents: r.totalSpentCents,
      lastOrderAt: r.lastOrderAt,
    })),
    ...guests
      .filter((g) => g.email) // skip null emails
      .map((g) => ({
        email: g.email!,
        name: g.name,
        type: 'guest' as const,
        orderCount: g.orderCount,
        totalSpentCents: g.totalSpentCents,
        lastOrderAt: g.lastOrderAt,
      })),
  ].sort((a, b) => {
    if (!a.lastOrderAt) return 1;
    if (!b.lastOrderAt) return -1;
    return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
  });

  const totalRevenueCents = all.reduce((sum, c) => sum + c.totalSpentCents, 0);

  return {
    customers: all,
    stats: {
      total: all.length,
      registered: registered.length,
      guests: guests.filter((g) => g.email).length,
      totalRevenueCents,
    },
  };
}

export default async function CustomersPage() {
  const data = await getCustomerOverview();
  const t = await getTranslations('admin');
  const locale = await getLocale();
  const dateLocale = locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : 'de-AT';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
          {t('customers.title')}
        </h1>
        <p className="text-muted text-sm mt-1">
          {t('customers.totalCount', { count: data.stats.total })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gold" />
            <span className="text-[10px] text-muted uppercase tracking-wider">{t('customers.totalStat')}</span>
          </div>
          <p className="text-cream text-xl font-semibold">{data.stats.total}</p>
        </div>

        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] text-muted uppercase tracking-wider">{t('customers.accounts')}</span>
          </div>
          <p className="text-cream text-xl font-semibold">{data.stats.registered}</p>
        </div>

        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserX className="w-4 h-4 text-muted" />
            <span className="text-[10px] text-muted uppercase tracking-wider">{t('customers.guests')}</span>
          </div>
          <p className="text-cream text-xl font-semibold">{data.stats.guests}</p>
        </div>

        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-4 h-4 text-gold" />
            <span className="text-[10px] text-muted uppercase tracking-wider">{t('customers.totalRevenue')}</span>
          </div>
          <p className="text-gold text-xl font-semibold font-[var(--font-heading)]">
            {formatEurCents(data.stats.totalRevenueCents)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
        {data.customers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="w-8 h-8 text-muted/30 mx-auto mb-3" />
            <p className="text-muted text-sm">{t('customers.noCustomers')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                    {t('customers.name')}
                  </th>
                  <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                    {t('customers.email')}
                  </th>
                  <th className="text-center text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                    {t('customers.type')}
                  </th>
                  <th className="text-center text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                    {t('customers.ordersCol')}
                  </th>
                  <th className="text-right text-[10px] text-muted uppercase tracking-wider px-5 py-3">
                    {t('customers.revenueCol')}
                  </th>
                  <th className="text-right text-[10px] text-muted uppercase tracking-wider px-5 py-3 hidden lg:table-cell">
                    {t('customers.lastOrder')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((customer) => (
                  <tr
                    key={customer.email}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/orders?email=${encodeURIComponent(customer.email)}`}
                        className="text-cream text-sm font-medium hover:text-gold transition-colors"
                      >
                        {customer.name || '—'}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-muted text-sm">{customer.email}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                          customer.type === 'account'
                            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                            : 'bg-gray-400/10 text-gray-400 border-gray-400/20'
                        }`}
                      >
                        {customer.type === 'account' ? t('customers.account') : t('customers.guest')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-cream text-sm">
                      {customer.orderCount}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-gold font-[var(--font-heading)] font-semibold text-sm">
                        {formatEurCents(customer.totalSpentCents)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-muted text-xs hidden lg:table-cell">
                      {customer.lastOrderAt
                        ? new Date(customer.lastOrderAt).toLocaleDateString(dateLocale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })
                        : '—'}
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
