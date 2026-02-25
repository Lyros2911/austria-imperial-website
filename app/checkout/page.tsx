'use client';

import { useCart } from '@/components/cart/cart-context';
import { formatEurCents } from '@/lib/utils';
import { useState } from 'react';
import { ShoppingBag, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { items, totalCents, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="py-32 px-6 text-center">
        <ShoppingBag className="w-12 h-12 text-muted mx-auto mb-4" />
        <h1 className="font-[var(--font-heading)] text-2xl text-cream mb-4">
          Dein Warenkorb ist leer
        </h1>
        <Link
          href="/products"
          className="text-gold text-sm hover:text-gold-light transition-colors"
        >
          ← Zurück zu den Produkten
        </Link>
      </div>
    );
  }

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Checkout fehlgeschlagen');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-muted text-sm hover:text-cream transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Weiter einkaufen
        </Link>

        <h1 className="font-[var(--font-heading)] text-3xl text-cream mb-10">Bestellübersicht</h1>

        {/* Items */}
        <div className="space-y-4 mb-8">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="flex justify-between items-center bg-surface border border-border rounded-lg p-5"
            >
              <div>
                <p className="text-cream text-sm font-medium">{item.productName}</p>
                <p className="text-muted text-xs mt-0.5">
                  {item.variantName} × {item.quantity}
                </p>
              </div>
              <p className="text-gold font-[var(--font-heading)] font-semibold">
                {formatEurCents(item.priceCents * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-border pt-6 space-y-3 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Zwischensumme</span>
            <span className="text-cream">{formatEurCents(totalCents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Versand</span>
            <span className="text-muted text-xs">Wird im nächsten Schritt berechnet</span>
          </div>
          <div className="gold-line my-4" />
          <div className="flex justify-between">
            <span className="text-cream font-medium">Gesamt</span>
            <span className="text-gold text-xl font-[var(--font-heading)] font-semibold">
              {formatEurCents(totalCents)}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-gold hover:bg-gold-light disabled:bg-gold/50 disabled:cursor-not-allowed text-[var(--aigg-black)] font-semibold text-sm tracking-wide py-4 rounded transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,165,90,0.2)]"
        >
          <Lock className="w-4 h-4" />
          {loading ? 'Wird weitergeleitet...' : 'Sicher bezahlen mit Stripe'}
        </button>

        <p className="text-muted text-xs text-center mt-4">
          Sie werden zu Stripe weitergeleitet um die Zahlung sicher abzuschließen.
        </p>
      </div>
    </div>
  );
}
