'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

// ─── Types ─────────────────────────────────────

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

const CART_KEY = 'aigg-cart';

// ─── Provider ──────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.variantId === item.variantId);
        if (existing) {
          return prev.map((i) =>
            i.variantId === item.variantId
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        }
        return [...prev, { ...item, quantity }];
      });
      setIsOpen(true);
    },
    []
  );

  const removeItem = useCallback((variantId: number) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_KEY);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalCents,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
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
