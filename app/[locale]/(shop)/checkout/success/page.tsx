'use client';

import { useEffect } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { Link } from '@/i18n/navigation';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

function SuccessContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const t = useTranslations('checkoutSuccess');

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="py-32 px-6">
      <div className="max-w-lg mx-auto text-center">
        {/* Success icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-green/10 border border-green/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-light" />
          </div>
        </div>

        <h1 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-4">
          {t('thankYou')}
        </h1>

        <p className="text-muted text-base leading-relaxed mb-4">
          {t('orderPlaced')}
        </p>

        <p className="text-muted/60 text-xs mb-12">
          {t('orderRef')} {sessionId ? sessionId.substring(0, 20) + '...' : '—'}
        </p>

        {/* What happens next */}
        <div className="bg-surface border border-border rounded-lg p-8 mb-10 text-left space-y-4">
          <h3 className="font-[var(--font-heading)] text-lg text-cream flex items-center gap-2">
            <Package className="w-5 h-5 text-gold" />
            {t('whatsNext')}
          </h3>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex gap-3">
              <span className="text-gold font-semibold">1.</span>
              {t('step1')}
            </li>
            <li className="flex gap-3">
              <span className="text-gold font-semibold">2.</span>
              {t('step2')}
            </li>
            <li className="flex gap-3">
              <span className="text-gold font-semibold">3.</span>
              {t('step3')}
            </li>
          </ul>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors text-sm"
        >
          {t('discoverMore')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  const t = useTranslations('checkoutSuccess');
  return (
    <Suspense fallback={
      <div className="py-32 px-6 text-center">
        <p className="text-muted">{t('loading')}</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
