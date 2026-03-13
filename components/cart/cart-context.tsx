/**
 * @deprecated ENTFERNT — 2026-03-13
 *
 * Austria Imperial Green Gold ist seit Maerz 2026 ein gemeinnuetziger Verein.
 * Es gibt KEINEN Warenkorb / Shop.
 * Diese Datei wird beim naechsten Cleanup geloescht.
 */
'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface CartItem {
  variantId: number;
  productSlug: string;
  productName: string;
  variantName: string;
  sku: string;
  priceCents: number;
  quantity: number;
  sizeMl?: number | null;
  producer: string;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalCents: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

/** Cart ist deaktiviert — gemeinnuetziger Verein */
export function CartProvider({ children }: { children: ReactNode }) {
  const noop = () => {};
  return (
    <CartContext.Provider
      value={{
        items: [],
        totalItems: 0,
        totalCents: 0,
        addItem: noop,
        removeItem: noop,
        updateQuantity: noop,
        clearCart: noop,
        isOpen: false,
        setIsOpen: noop,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
