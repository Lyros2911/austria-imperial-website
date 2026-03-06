'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';

interface NewsletterSignupProps {
  source?: string;
}

export function NewsletterSignup({ source = 'website' }: NewsletterSignupProps) {
  const t = useTranslations('newsletter');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), locale, source }),
      });

      if (res.status === 409) {
        setStatus('duplicate');
        return;
      }

      if (!res.ok) {
        setStatus('error');
        return;
      }

      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="p-4 border border-gold/30 rounded bg-gold/5 text-center">
        <p className="text-gold text-sm">{t('success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
            placeholder={t('placeholder')}
            required
            className="w-full pl-10 pr-4 py-3 bg-surface border border-border-gold rounded text-cream text-sm placeholder:text-muted/50 focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-3 bg-gold hover:bg-gold-light text-[var(--aigg-black)] font-semibold text-sm rounded transition-all duration-300 disabled:opacity-50 whitespace-nowrap"
        >
          {status === 'loading' ? t('submitting') : t('submit')}
        </button>
      </div>

      {status === 'duplicate' && (
        <p className="text-gold/70 text-xs mt-2">{t('alreadySubscribed')}</p>
      )}
      {status === 'error' && (
        <p className="text-red-400 text-xs mt-2">{t('error')}</p>
      )}

      <p className="text-muted/50 text-xs mt-3">{t('privacy')}</p>
    </form>
  );
}
