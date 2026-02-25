'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen');
      }

      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060606] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-gold/30 bg-gold/5 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gold" />
          </div>
          <h1 className="font-[var(--font-heading)] text-2xl text-cream font-semibold">
            Admin Dashboard
          </h1>
          <p className="text-muted text-xs mt-1.5 tracking-wide">
            Austria Imperial — Green Gold
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-muted text-xs tracking-wider uppercase">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="admin@austria-imperial.com"
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-cream text-sm placeholder:text-muted/40 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-muted text-xs tracking-wider uppercase">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-cream text-sm placeholder:text-muted/40 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-light disabled:bg-gold/40 disabled:cursor-not-allowed text-[var(--aigg-black)] font-semibold text-sm py-3.5 rounded-lg transition-all duration-300"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Anmelden...
              </>
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        <p className="text-muted/40 text-[10px] text-center mt-8">
          Zugang nur für autorisiertes Personal
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#060606]">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
