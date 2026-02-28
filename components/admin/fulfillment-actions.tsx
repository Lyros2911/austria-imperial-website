'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react';

interface FulfillmentOrderData {
  id: number;
  producer: string;
  status: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  retryCount: number;
  lastError: string | null;
}

/**
 * Retry Button — re-dispatches a failed/pending fulfillment order.
 */
export function RetryButton({ fulfillmentOrder }: { fulfillmentOrder: FulfillmentOrderData }) {
  const t = useTranslations('admin');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const canRetry = ['pending', 'failed'].includes(fulfillmentOrder.status);

  const handleRetry = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/fulfillment/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillmentOrderId: fulfillmentOrder.id }),
      });
      const data = await res.json();
      setResult({ success: data.success, error: data.error });

      if (data.success) {
        // Reload page after short delay
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      setResult({ success: false, error: t('fulfillmentActions.networkError') });
    } finally {
      setLoading(false);
    }
  };

  if (!canRetry) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRetry}
        disabled={loading}
        className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 text-gold rounded px-3 py-1.5 text-[10px] font-medium hover:bg-gold/20 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3" />
        )}
        {t('fulfillmentActions.retry')}
      </button>
      {result && (
        <span className={`text-[10px] flex items-center gap-1 ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
          {result.success ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {result.success ? t('fulfillmentActions.sent') : result.error}
        </span>
      )}
    </div>
  );
}

/**
 * Status Update Form — manual status change with optional tracking info.
 */
export function StatusUpdateForm({ fulfillmentOrder }: { fulfillmentOrder: FulfillmentOrderData }) {
  const t = useTranslations('admin');
  const [status, setStatus] = useState(fulfillmentOrder.status);
  const [trackingNumber, setTrackingNumber] = useState(fulfillmentOrder.trackingNumber ?? '');
  const [trackingUrl, setTrackingUrl] = useState(fulfillmentOrder.trackingUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Don't show for terminal states
  if (['delivered', 'cancelled'].includes(fulfillmentOrder.status)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/fulfillment/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillmentOrderId: fulfillmentOrder.id,
          status,
          trackingNumber: trackingNumber || undefined,
          trackingUrl: trackingUrl || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Status → ${status}` });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage({ type: 'error', text: data.error || t('fulfillmentActions.error') });
      }
    } catch {
      setMessage({ type: 'error', text: t('fulfillmentActions.networkError') });
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: t('fulfillmentStatus.pending') },
    { value: 'sent_to_producer', label: t('fulfillmentStatus.sent_to_producer') },
    { value: 'confirmed', label: t('fulfillmentStatus.confirmed') },
    { value: 'shipped', label: t('fulfillmentStatus.shipped') },
    { value: 'delivered', label: t('fulfillmentStatus.delivered') },
    { value: 'failed', label: t('fulfillmentStatus.failed') },
    { value: 'cancelled', label: t('fulfillmentStatus.cancelled') },
  ];

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-white/[0.06]">
      <p className="text-[10px] text-muted uppercase tracking-wider mb-2">{t('fulfillmentActions.updateStatusManually')}</p>
      <div className="flex flex-wrap gap-2 items-end">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[#080808] border border-white/[0.08] rounded px-2 py-1.5 text-cream text-[11px] focus:border-gold/40 focus:outline-none"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder={t('fulfillmentActions.trackingNumber')}
          className="bg-[#080808] border border-white/[0.08] rounded px-2 py-1.5 text-cream text-[11px] w-32 placeholder:text-muted/30 focus:border-gold/40 focus:outline-none"
        />
        <input
          type="text"
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
          placeholder={t('fulfillmentActions.trackingUrl')}
          className="bg-[#080808] border border-white/[0.08] rounded px-2 py-1.5 text-cream text-[11px] w-44 placeholder:text-muted/30 focus:border-gold/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.1] text-cream rounded px-3 py-1.5 text-[10px] hover:bg-white/[0.1] disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {t('fulfillmentActions.save')}
        </button>
      </div>
      {message && (
        <p className={`text-[10px] mt-2 ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
