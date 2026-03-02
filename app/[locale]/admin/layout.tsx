'use client';

import { usePathname, useRouter, Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  BarChart3,
  BookOpen,
  FileText,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Users,
  Shield,
  Globe,
  Factory,
  Wallet,
  GraduationCap,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
}

function buildNavigation(role: string, t: (key: string) => string): NavItem[] {
  // Producer sieht nur Dashboard, Bestellungen (eigene), Fulfillment (eigenes)
  if (role === 'producer') {
    return [
      { label: t('nav.dashboard'), href: '/admin', icon: LayoutDashboard },
      { label: t('nav.orders'), href: '/admin/orders', icon: ShoppingCart },
      { label: t('nav.fulfillment'), href: '/admin/fulfillment', icon: Truck },
    ];
  }

  const nav: NavItem[] = [
    { label: t('nav.dashboard'), href: '/admin', icon: LayoutDashboard },
    { label: t('nav.orders'), href: '/admin/orders', icon: ShoppingCart },
    { label: t('nav.customers'), href: '/admin/customers', icon: Users },
  ];

  // Fulfillment nur für Admins (enthält Write-Aktionen)
  if (role === 'admin') {
    nav.push({ label: t('nav.fulfillment'), href: '/admin/fulfillment', icon: Truck });
  }

  nav.push({
    label: t('nav.accounting'),
    href: '/admin/accounting',
    icon: BarChart3,
    children: [
      { label: t('nav.overview'), href: '/admin/accounting' },
      { label: t('nav.ledger'), href: '/admin/accounting/ledger' },
      { label: t('nav.reports'), href: '/admin/accounting/reports' },
    ],
  });

  // Vereins-Bereich (Finanzen + Mitglieder)
  nav.push({
    label: t('nav.verein'),
    href: '/admin/verein',
    icon: Wallet,
    children: [
      { label: t('nav.transactions'), href: '/admin/verein' },
      { label: t('nav.mitglieder'), href: '/admin/verein/mitglieder' },
    ],
  });

  // Studienberichte
  nav.push({ label: t('nav.studien'), href: '/admin/studien', icon: GraduationCap });

  // Benutzerverwaltung nur für Admins
  if (role === 'admin') {
    nav.push({ label: t('nav.users'), href: '/admin/users', icon: Shield });
    nav.push({ label: t('nav.partners'), href: '/admin/partners', icon: Globe });
    nav.push({ label: t('nav.producers'), href: '/admin/producers', icon: Factory });
  }

  return nav;
}

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('admin');
  const locale = useLocale();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [adminName, setAdminName] = useState<string>('');
  const [adminRole, setAdminRole] = useState<string>('');
  const [adminProducer, setAdminProducer] = useState<string | null>(null);
  const navigation = buildNavigation(adminRole, t);

  useEffect(() => {
    // Auto-expand groups based on current path
    navigation.forEach((item) => {
      if (item.children && pathname.startsWith(item.href)) {
        setExpandedGroups((prev) =>
          prev.includes(item.href) ? prev : [...prev, item.href]
        );
      }
    });

    // Fetch admin session
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) => {
        setAdminName(d.name || d.email || '');
        setAdminRole(d.role || '');
        setAdminProducer(d.producer || null);
      })
      .catch(() => {});
  }, [pathname]);

  const toggleGroup = (href: string) => {
    setExpandedGroups((prev) =>
      prev.includes(href)
        ? prev.filter((h) => h !== href)
        : [...prev, href]
    );
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] border-r border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <div>
          <h2 className="font-[var(--font-heading)] text-base text-cream font-semibold tracking-wide">
            {adminProducer ? t(`producerLabel.${adminProducer}`) : t('title')}
          </h2>
          <p className="text-[10px] text-gold/60 mt-0.5">
            {adminProducer ? t('producerPortal') : t('subtitle')}
          </p>
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
          const expanded = expandedGroups.includes(item.href);

          if (item.children) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleGroup(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'text-gold bg-gold/[0.06]'
                      : 'text-muted hover:text-cream hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      expanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expanded && (
                  <div className="ml-7 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3">
                    {item.children.map((child) => {
                      const childActive =
                        child.href === '/admin/accounting' || child.href === '/admin/verein'
                          ? pathname === child.href
                          : pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={`block px-3 py-2 rounded text-xs transition-colors ${
                            childActive
                              ? 'text-gold bg-gold/[0.06]'
                              : 'text-muted hover:text-cream hover:bg-white/[0.03]'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'text-gold bg-gold/[0.06]'
                  : 'text-muted hover:text-cream hover:bg-white/[0.03]'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06] space-y-3">
        {adminName && (
          <div className="px-3">
            <p className="text-cream text-xs font-medium truncate">{adminName}</p>
            <p className="text-muted/50 text-[10px]">
              {adminRole === 'admin' ? t('role.admin') : adminRole === 'producer' ? t('role.producer') : t('role.viewer')}
            </p>
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
                  : 'text-muted hover:text-cream border border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-red-400 hover:bg-red-900/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>

        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-muted/50 hover:text-cream/60 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          {t('nav.backToShop')}
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Don't show sidebar on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-[#080808] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <AdminSidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-4 px-4 h-14 border-b border-white/[0.06] bg-[#0a0a0a]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted hover:text-cream p-1"
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
