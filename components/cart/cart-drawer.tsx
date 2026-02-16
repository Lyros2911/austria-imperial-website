'use client';

import { useCart } from './cart-context';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { formatEurCents } from '@/lib/utils';
import Link from 'next/link';

export function CartDrawer() {
  const { items, totalItems, totalCents, isOpen, setIsOpen, updateQuantity, removeItem } =
    useCart();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-surface border-l border-border-gold flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-gold">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-gold" strokeWidth={1.5} />
            <h2 className="font-[var(--font-heading)] text-lg text-cream">
              Warenkorb
              {totalItems > 0 && (
                <span className="text-muted text-sm ml-2">({totalItems})</span>
              )}
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-muted hover:text-cream transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted gap-4">
              <ShoppingBag className="w-12 h-12 opacity-30" />
              <p className="text-sm">Dein Warenkorb ist leer</p>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gold text-sm hover:text-gold-light transition-colors"
              >
                Weiter einkaufen →
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.variantId}
                  className="flex gap-4 bg-surface-elevated rounded-lg p-4 border border-border"
                >
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-cream text-sm font-medium truncate">
                      {item.productName}
                    </p>
                    <p className="text-muted text-xs mt-0.5">{item.variantName}</p>
                    <p className="text-gold text-sm font-medium mt-2">
                      {formatEurCents(item.priceCents)}
                    </p>
                  </div>

                  {/* Quantity + Remove */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="p-1 text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-2 bg-[var(--aigg-black)] rounded border border-border">
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        className="p-1.5 text-muted hover:text-cream transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-cream text-xs w-5 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                        className="p-1.5 text-muted hover:text-cream transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border-gold px-6 py-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted text-sm">Zwischensumme</span>
              <span className="text-cream text-lg font-[var(--font-heading)] font-semibold">
                {formatEurCents(totalCents)}
              </span>
            </div>
            <p className="text-muted text-xs">Versandkosten werden im Checkout berechnet.</p>
            <Link
              href="/checkout"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center bg-gold hover:bg-gold-light text-[var(--aigg-black)] font-semibold text-sm tracking-wide py-3.5 rounded transition-colors duration-300"
            >
              Zur Kasse
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
