'use client';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useCart } from '@/components/cart/cart-context';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { routing } from '@/i18n/routing';

export function Header() {
  const t = useTranslations('nav');
  const tLang = useTranslations('language');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, setIsOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLocaleSwitch = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

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
            <NavLink href="/products">{t('products')}</NavLink>
            <NavLink href="/about">{t('about')}</NavLink>
            <NavLink href="/contact">{t('contact')}</NavLink>
          </nav>

          {/* Language Switcher + Cart + Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="hidden sm:flex items-center border border-border-gold rounded overflow-hidden text-xs">
              {routing.locales.map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLocaleSwitch(loc)}
                  className={`px-2.5 py-1.5 transition-colors duration-200 ${
                    locale === loc
                      ? 'bg-gold text-[var(--aigg-black)] font-semibold'
                      : 'text-muted hover:text-cream'
                  }`}
                >
                  {tLang(loc)}
                </button>
              ))}
            </div>

            {/* Cart */}
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2 text-cream hover:text-gold transition-colors"
              aria-label={t('openCart')}
            >
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gold text-[var(--aigg-black)] text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-cream hover:text-gold transition-colors"
              aria-label={t('menu')}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border-gold bg-[var(--aigg-black)]/95 backdrop-blur-md animate-slide-down">
            <nav className="flex flex-col px-6 py-6 gap-4">
              <MobileNavLink href="/products" onClick={() => setMenuOpen(false)}>{t('products')}</MobileNavLink>
              <MobileNavLink href="/about" onClick={() => setMenuOpen(false)}>{t('about')}</MobileNavLink>
              <MobileNavLink href="/contact" onClick={() => setMenuOpen(false)}>{t('contact')}</MobileNavLink>

              {/* Mobile Language Switcher */}
              <div className="flex items-center gap-3 pt-4 border-t border-border-gold mt-2">
                {routing.locales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => { handleLocaleSwitch(loc); setMenuOpen(false); }}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      locale === loc
                        ? 'bg-gold text-[var(--aigg-black)] font-semibold'
                        : 'text-muted hover:text-cream border border-border-gold'
                    }`}
                  >
                    {tLang(loc)}
                  </button>
                ))}
              </div>
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
