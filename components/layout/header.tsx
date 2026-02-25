'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { ShoppingBag, Menu, X } from 'lucide-react';

export function Header() {
  const { totalItems, isOpen, setIsOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-[var(--aigg-black)]/90 backdrop-blur-md border-b border-border-gold">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/images/logo-header.png"
              alt="Austria Imperial Green Gold"
              width={160}
              height={48}
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10">
            <NavLink href="/products">Produkte</NavLink>
            <NavLink href="/about">Über Uns</NavLink>
            <NavLink href="/contact">Kontakt</NavLink>
          </nav>

          {/* Cart + Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2 text-cream hover:text-gold transition-colors"
              aria-label="Warenkorb öffnen"
            >
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gold text-[var(--aigg-black)] text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-cream hover:text-gold transition-colors"
              aria-label="Menü"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border-gold bg-[var(--aigg-black)]/95 backdrop-blur-md animate-slide-down">
            <nav className="flex flex-col px-6 py-6 gap-4">
              <MobileNavLink href="/products" onClick={() => setMenuOpen(false)}>Produkte</MobileNavLink>
              <MobileNavLink href="/about" onClick={() => setMenuOpen(false)}>Über Uns</MobileNavLink>
              <MobileNavLink href="/contact" onClick={() => setMenuOpen(false)}>Kontakt</MobileNavLink>
            </nav>
          </div>
        )}
      </header>

      {/* Spacer */}
      <div className="h-20" />

      {/* Cart Drawer */}
      <CartDrawer />
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-cream/70 text-sm tracking-wide uppercase hover:text-gold transition-colors duration-300"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-cream text-lg font-[var(--font-heading)] hover:text-gold transition-colors py-2"
    >
      {children}
    </Link>
  );
}
