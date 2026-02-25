import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
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
              Authentische österreichische Spezialitäten direkt vom Erzeuger.
              Steirisches Kürbiskernöl g.g.A. und feiner Kren.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-cream text-sm tracking-[0.2em] uppercase mb-4">Navigation</h4>
            <nav className="flex flex-col gap-2">
              <FooterLink href="/products">Produkte</FooterLink>
              <FooterLink href="/about">Über Uns</FooterLink>
              <FooterLink href="/contact">Kontakt</FooterLink>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-cream text-sm tracking-[0.2em] uppercase mb-4">Rechtliches</h4>
            <nav className="flex flex-col gap-2">
              <FooterLink href="/legal/impressum">Impressum</FooterLink>
              <FooterLink href="/legal/datenschutz">Datenschutz</FooterLink>
              <FooterLink href="/legal/agb">AGB</FooterLink>
              <FooterLink href="/legal/widerruf">Widerrufsbelehrung</FooterLink>
              <FooterLink href="/admin/login">Admin</FooterLink>
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="gold-line mt-12 mb-8" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-muted text-xs">
          <p>&copy; {new Date().getFullYear()} Austria Imperial — Green Gold. Alle Rechte vorbehalten.</p>
          <p className="tracking-wide">
            Powered by{' '}
            <Link href="https://auryx.cloud" target="_blank" className="text-gold hover:text-gold-light transition-colors">
              auryx.cloud
            </Link>
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
