'use client';

import { usePathname, useRouter, Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  DollarSign,
  MessageSquare,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  Globe,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

function PartnerSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('partner');
  const locale = useLocale();
  const [partnerName, setPartnerName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    fetch('/api/partner/session')
      .then((r) => r.json())
      .then((d) => {
        setPartnerName(d.name || d.email || '');
        setCompanyName(d.companyName || '');
      })
      .catch(() => {});
  }, [pathname]);

  const navigation: NavItem[] = [
    { label: t('nav.dashboard'), href: '/partner', icon: LayoutDashboard },
    { label: t('nav.orders'), href: '/partner/orders', icon: ShoppingCart },
    { label: t('nav.documents'), href: '/partner/documents', icon: FileText },
    { label: t('nav.priceList'), href: '/partner/price-list', icon: DollarSign },
    { label: t('nav.messages'), href: '/partner/messages', icon: MessageSquare },
    { label: t('nav.newOrder'), href: '/partner/new-order', icon: ShoppingBag },
  ];

  const handleLogout = async () => {
    await fetch('/api/partner/logout', { method: 'POST' });
    router.push('/partner/login');
  };

  const isActive = (href: string) => {
    if (href === '/partner') return pathname === '/partner';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a1628] border-r border-white/[0.08]">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
        <div>
          <h2 className="font-[var(--font-heading)] text-base text-cream font-semibold tracking-wide">
            {t('title')}
          </h2>
          <p className="text-[10px] text-gold/60 mt-0.5">{t('subtitle')}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-cream p-1 lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'text-gold bg-gold/[0.08] border border-gold/20'
                  : 'text-slate-400 hover:text-cream hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.08] space-y-3">
        {(partnerName || companyName) && (
          <div className="px-3">
            <p className="text-cream text-xs font-medium truncate">{partnerName}</p>
            {companyName && (
              <p className="text-slate-500 text-[10px] mt-0.5">{companyName}</p>
            )}
          </div>
        )}
        <div className="flex gap-1 px-3 mb-2">
          {(['de', 'en', 'ar'] as const).map((code) => (
            <button
              key={code}
              onClick={() => router.replace(pathname, { locale: code })}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                locale === code
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'text-slate-500 hover:text-cream border border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>
      </div>
    </div>
  );
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('partner');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Don't show sidebar on login page
  if (pathname === '/partner/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-[#060e1a] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <PartnerSidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
            <PartnerSidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-4 px-4 h-14 border-b border-white/[0.08] bg-[#0a1628]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-cream p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-[var(--font-heading)] text-sm text-cream">{t('title')}</span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
