export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { orders, financialLedger } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { formatEurCents } from '@/lib/utils';
import { getAdminSession } from '@/lib/auth/admin';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  CreditCard,
  BookOpen,
} from 'lucide-react';
import { RetryButton, StatusUpdateForm } from '@/components/admin/fulfillment-actions';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  paid: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  processing: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  partially_shipped: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  shipped: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
  delivered: 'bg-green-400/10 text-green-400 border-green-400/20',
  cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  refunded: 'bg-red-400/10 text-red-400 border-red-400/20',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  paid: 'Bezahlt',
  processing: 'In Bearbeitung',
  partially_shipped: 'Teilversandt',
  shipped: 'Versandt',
  delivered: 'Zugestellt',
  cancelled: 'Storniert',
  refunded: 'Erstattet',
};

const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  sent_to_producer: 'An Produzent',
  confirmed: 'Bestätigt',
  shipped: 'Versandt',
  delivered: 'Zugestellt',
  failed: 'Fehlgeschlagen',
  cancelled: 'Storniert',
};

const FULFILLMENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  sent_to_producer: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  confirmed: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
  shipped: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  delivered: 'bg-green-400/10 text-green-400 border-green-400/20',
  failed: 'bg-red-400/10 text-red-400 border-red-400/20',
  cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
};

async function getOrderDetail(id: number) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: {
        with: {
          productVariant: {
            with: {
              product: true,
            },
          },
        },
      },
      fulfillmentOrders: {
        with: {
          events: true,
        },
      },
      ledgerEntries: true,
    },
  });

  return order;
}

function InfoBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gold" />
        <h3 className="text-cream text-sm font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = parseInt(id);
  if (isNaN(orderId)) notFound();

  const order = await getOrderDetail(orderId);
  if (!order) notFound();

  const session = await getAdminSession();
  const isAdmin = session?.role === 'admin';

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-muted text-xs hover:text-cream transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Zurück zur Übersicht
        </Link>

        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {order.orderNumber}
          </h1>
          <span
            className={`inline-flex px-3 py-1 rounded text-xs font-medium border ${
              STATUS_STYLES[order.status] || 'bg-gray-400/10 text-gray-400'
            }`}
          >
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>

        <p className="text-muted text-xs mt-2">
          Erstellt am{' '}
          {new Date(order.createdAt).toLocaleDateString('de-AT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Shipping Address */}
        <InfoBlock icon={MapPin} title="Lieferadresse">
          <div className="text-muted text-sm space-y-0.5">
            <p className="text-cream">{order.shippingName || '—'}</p>
            {order.shippingStreet && <p>{order.shippingStreet}</p>}
            {order.shippingStreet2 && <p>{order.shippingStreet2}</p>}
            <p>
              {order.shippingPostalCode} {order.shippingCity}
            </p>
            {order.shippingCountry && <p>{order.shippingCountry}</p>}
          </div>
        </InfoBlock>

        {/* Payment */}
        <InfoBlock icon={CreditCard} title="Zahlung">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="text-cream">{formatEurCents(order.subtotalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Versand</span>
              <span className="text-cream">{formatEurCents(order.shippingCents)}</span>
            </div>
            <div className="border-t border-white/[0.06] pt-2 flex justify-between font-medium">
              <span className="text-cream">Gesamt</span>
              <span className="text-gold">{formatEurCents(order.totalCents)}</span>
            </div>
            {order.stripePaymentIntentId && (
              <p className="text-muted text-[10px] mt-2 font-mono truncate">
                PI: {order.stripePaymentIntentId}
              </p>
            )}
          </div>
        </InfoBlock>

        {/* Customer */}
        <InfoBlock icon={Package} title="Kunde">
          <div className="text-sm space-y-1.5">
            <p className="text-cream">{order.shippingName || '—'}</p>
            {order.guestEmail && (
              <p className="text-muted">{order.guestEmail}</p>
            )}
            <p className="text-muted text-xs">
              {order.customerId ? `Konto #${order.customerId}` : 'Gast-Bestellung'}
            </p>
          </div>
        </InfoBlock>
      </div>

      {/* Order Items */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-cream text-sm font-medium">Positionen</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-2.5">
                Produkt
              </th>
              <th className="text-left text-[10px] text-muted uppercase tracking-wider px-5 py-2.5">
                Produzent
              </th>
              <th className="text-center text-[10px] text-muted uppercase tracking-wider px-5 py-2.5">
                Menge
              </th>
              <th className="text-right text-[10px] text-muted uppercase tracking-wider px-5 py-2.5">
                Stückpreis
              </th>
              <th className="text-right text-[10px] text-muted uppercase tracking-wider px-5 py-2.5">
                Gesamt
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-white/[0.03] last:border-0"
              >
                <td className="px-5 py-3">
                  <p className="text-cream text-sm">{item.productVariant.product.nameDe}</p>
                  <p className="text-muted text-[11px]">
                    {item.productVariant.nameDe} · SKU: {item.productVariant.sku}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <span className="text-muted text-xs capitalize">{item.producer}</span>
                </td>
                <td className="px-5 py-3 text-center text-cream text-sm">{item.quantity}</td>
                <td className="px-5 py-3 text-right text-muted text-sm">
                  {formatEurCents(item.unitPriceCents)}
                </td>
                <td className="px-5 py-3 text-right text-cream text-sm font-medium">
                  {formatEurCents(item.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fulfillment Orders */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <Truck className="w-4 h-4 text-gold" />
          <h3 className="text-cream text-sm font-medium">Fulfillment</h3>
        </div>

        {order.fulfillmentOrders.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted text-sm">
            Keine Fulfillment Orders
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {order.fulfillmentOrders.map((fo) => (
              <div key={fo.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-cream text-sm font-medium capitalize">
                      {fo.producer}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                        FULFILLMENT_STATUS_STYLES[fo.status] || 'bg-gray-400/10 text-gray-400'
                      }`}
                    >
                      {FULFILLMENT_STATUS_LABELS[fo.status] || fo.status}
                    </span>
                  </div>
                  {fo.trackingNumber && (
                    <span className="text-muted text-xs font-mono">
                      Tracking: {fo.trackingNumber}
                    </span>
                  )}
                </div>
                {fo.lastError && (
                  <p className="text-red-400 text-xs mt-1">Fehler: {fo.lastError}</p>
                )}
                {fo.retryCount > 0 && (
                  <p className="text-muted text-[10px] mt-1">
                    Retry-Versuche: {fo.retryCount}
                  </p>
                )}

                {/* Admin Actions — nur für admin-Rolle sichtbar */}
                {isAdmin && (
                  <>
                    <div className="mt-2 flex items-center gap-3">
                      <RetryButton
                        fulfillmentOrder={{
                          id: fo.id,
                          producer: fo.producer,
                          status: fo.status,
                          trackingNumber: fo.trackingNumber,
                          trackingUrl: fo.trackingUrl,
                          retryCount: fo.retryCount,
                          lastError: fo.lastError,
                        }}
                      />
                    </div>

                    <StatusUpdateForm
                      fulfillmentOrder={{
                        id: fo.id,
                        producer: fo.producer,
                        status: fo.status,
                        trackingNumber: fo.trackingNumber,
                        trackingUrl: fo.trackingUrl,
                        retryCount: fo.retryCount,
                        lastError: fo.lastError,
                      }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial Ledger Entries */}
      {order.ledgerEntries.length > 0 && (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gold" />
            <h3 className="text-cream text-sm font-medium">Buchungen (Ledger)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-[10px] text-muted uppercase px-5 py-2.5">Typ</th>
                  <th className="text-right text-[10px] text-muted uppercase px-5 py-2.5">Umsatz</th>
                  <th className="text-right text-[10px] text-muted uppercase px-5 py-2.5">Kosten</th>
                  <th className="text-right text-[10px] text-muted uppercase px-5 py-2.5">Gewinn</th>
                  <th className="text-right text-[10px] text-muted uppercase px-5 py-2.5">Peter</th>
                  <th className="text-right text-[10px] text-muted uppercase px-5 py-2.5">AIGG</th>
                  <th className="text-left text-[10px] text-muted uppercase px-5 py-2.5">Datum</th>
                </tr>
              </thead>
              <tbody>
                {order.ledgerEntries.map((entry) => {
                  const isRefund = entry.entryType.includes('refund');
                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-white/[0.03] last:border-0 ${
                        isRefund ? 'text-red-400' : ''
                      }`}
                    >
                      <td className="px-5 py-3 text-xs capitalize">
                        {entry.entryType.replace('_', ' ')}
                      </td>
                      <td className={`px-5 py-3 text-right text-xs ${isRefund ? 'text-red-400' : 'text-cream'}`}>
                        {formatEurCents(entry.revenueCents)}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-muted">
                        {formatEurCents(
                          entry.producerCostCents +
                            entry.shippingCostCents +
                            entry.paymentFeeCents +
                            entry.packagingCents +
                            entry.customsCents
                        )}
                      </td>
                      <td className={`px-5 py-3 text-right text-xs font-medium ${isRefund ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatEurCents(entry.grossProfitCents)}
                      </td>
                      <td className={`px-5 py-3 text-right text-xs ${isRefund ? 'text-red-400' : 'text-gold'}`}>
                        {formatEurCents(entry.peterShareCents)}
                      </td>
                      <td className={`px-5 py-3 text-right text-xs ${isRefund ? 'text-red-400' : 'text-cream'}`}>
                        {formatEurCents(entry.aiggShareCents)}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted">
                        {new Date(entry.createdAt).toLocaleDateString('de-AT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
