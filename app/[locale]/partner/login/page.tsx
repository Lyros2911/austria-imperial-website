'use client';

import { useState, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Loader2, Globe } from 'lucide-react';

function PartnerLoginForm() {
  const t = useTranslations('partner.login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/partner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('error'));
        return;
      }

      const from = searchParams.get('from');
      router.push(from || '/partner');
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060e1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-gold" />
          </div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            {t('title')}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t('subtitle')}</p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#0a1628] border border-white/[0.08] rounded-2xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-900/20 border border-red-800/30 text-red-300 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="text-slate-400 text-[10px] tracking-wider uppercase mb-1.5 block">
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#060e1a] border border-white/[0.08] rounded-lg px-4 py-3 text-cream text-sm focus:border-gold/40 focus:outline-none transition-colors"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <label className="text-slate-400 text-[10px] tracking-wider uppercase mb-1.5 block">
              {t('password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[#060e1a] border border-white/[0.08] rounded-lg px-4 py-3 text-cream text-sm focus:border-gold/40 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-gold-light disabled:bg-gold/40 disabled:cursor-not-allowed text-[var(--aigg-black)] font-semibold text-sm py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('signingIn')}
              </>
            ) : (
              t('signIn')
            )}
          </button>
        </form>

        <p className="text-center text-slate-600 text-[11px] mt-6">
          Austria Imperial Green Gold — {t('partnerAccess')}
        </p>
      </div>
    </div>
  );
}

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#060e1a]">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    }>
      <PartnerLoginForm />
    </Suspense>
  );
}
