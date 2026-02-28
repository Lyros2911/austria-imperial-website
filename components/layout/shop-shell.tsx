'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartProvider } from '@/components/cart/cart-context';

/**
 * ShopShell — wraps shop pages with Header/Footer/CartProvider.
 * Only rendered inside [locale] layout — admin routes have their own layout.
 */
export function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </CartProvider>
  );
}
