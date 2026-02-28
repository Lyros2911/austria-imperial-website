'use client';

import { Link } from '@/i18n/navigation';
import NextLink from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');

  return (
    <footer className="border-t border-border-gold bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <Image
              src="/images/logo.png"
              alt="Austria Imperial Green Gold"
              width={140}
              height={140}
              className="w-[140px] h-auto mb-4"
            />
            <p className="text-muted text-sm leading-relaxed max-w-xs">
              {t('description')}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-cream text-sm tracking-[0.2em] uppercase mb-4">{t('navigation')}</h4>
            <nav className="flex flex-col gap-2">
              <FooterLink href="/products">{tNav('products')}</FooterLink>
              <FooterLink href="/about">{tNav('about')}</FooterLink>
              <FooterLink href="/contact">{tNav('contact')}</FooterLink>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-cream text-sm tracking-[0.2em] uppercase mb-4">{t('legal')}</h4>
            <nav className="flex flex-col gap-2">
              <FooterLink href="/legal/impressum">{t('impressum')}</FooterLink>
              <FooterLink href="/legal/datenschutz">{t('datenschutz')}</FooterLink>
              <FooterLink href="/legal/agb">{t('agb')}</FooterLink>
              <FooterLink href="/legal/widerruf">{t('widerruf')}</FooterLink>
              <Link href="/admin/login" className="text-muted text-sm hover:text-gold transition-colors duration-300">
                {t('admin')}
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="gold-line mt-12 mb-8" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-muted text-xs">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
          <p className="tracking-wide">
            {t('poweredBy')}{' '}
            <NextLink href="https://auryx.cloud" target="_blank" className="text-gold hover:text-gold-light transition-colors">
              auryx.cloud
            </NextLink>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-muted text-sm hover:text-gold transition-colors duration-300">
      {children}
    </Link>
  );
}
