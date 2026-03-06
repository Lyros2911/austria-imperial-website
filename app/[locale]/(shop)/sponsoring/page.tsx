import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  Camera,
  Plane,
  Watch,
  Truck,
  Wifi,
  UtensilsCrossed,
  Video,
  Dumbbell,
  Pill,
  Mountain,
  Stethoscope,
  TestTube,
  Headphones,
  Code,
  Handshake,
  Mail,
} from 'lucide-react';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sponsoring.meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

const CATEGORIES = [
  'cameras360', 'drones', 'wearables', 'vehicle', 'internet', 'kitchen',
  'cameras', 'sport', 'supplements', 'outdoor', 'telemedizin', 'bloodtest',
  'audio', 'software',
] as const;

const CATEGORY_ICONS = [
  Camera,            // cameras360
  Plane,             // drones
  Watch,             // wearables
  Truck,             // vehicle
  Wifi,              // internet
  UtensilsCrossed,   // kitchen
  Video,             // cameras
  Dumbbell,          // sport
  Pill,              // supplements
  Mountain,          // outdoor
  Stethoscope,       // telemedizin
  TestTube,          // bloodtest
  Headphones,        // audio
  Code,              // software
];

const TIERS = ['presenting', 'category', 'equipment'] as const;

export default async function SponsoringPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'sponsoring' });

  return (
    <div>
      {/* ═══ Hero ═══ */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--aigg-black)] via-[#0d0c09] to-[var(--aigg-black)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(197,165,90,0.08)_0%,transparent_70%)]" />
        <div className="absolute top-1/3 left-0 right-0 gold-line opacity-20" />

        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
          <p className="text-gold/60 text-xs tracking-[0.4em] uppercase mb-8">
            {t('hero.tagline')}
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl md:text-6xl font-semibold text-cream leading-[1.05] mb-6">
            <span className="text-gold-shimmer">{t('hero.title')}</span>
          </h1>
          <p className="text-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* ═══ Categories ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {t('categories.tagline')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-4">
              {t('categories.title')}
            </h2>
            <p className="text-muted text-base max-w-2xl mx-auto">
              {t('categories.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {CATEGORIES.map((cat, i) => {
              const Icon = CATEGORY_ICONS[i];
              return (
                <div
                  key={cat}
                  className="p-6 border border-border-gold rounded bg-surface hover:border-gold/40 transition-colors duration-300"
                >
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-[var(--font-heading)] text-cream text-base mb-2 text-center">
                    {t(`categories.items.${cat}.title`)}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed text-center">
                    {t(`categories.items.${cat}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ═══ Tiers ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {t('tiers.tagline')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-4">
              {t('tiers.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TIERS.map((tier) => (
              <div
                key={tier}
                className="p-6 border border-border-gold rounded bg-surface hover:border-gold/40 transition-colors duration-300"
              >
                <Handshake className="w-6 h-6 text-gold mb-4" />
                <h3 className="font-[var(--font-heading)] text-cream text-lg mb-3">
                  {t(`tiers.items.${tier}.title`)}
                </h3>
                <p className="text-muted text-sm leading-relaxed mb-4">
                  {t(`tiers.items.${tier}.description`)}
                </p>
                <ul className="space-y-2">
                  {[0, 1, 2].map((j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-cream/70">
                      <span className="text-gold mt-0.5">&#x2713;</span>
                      {t(`tiers.items.${tier}.benefits.${j}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ═══ Partner Logos Placeholder ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {t('partners.tagline')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold">
              {t('partners.title')}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/2] border border-dashed border-border-gold rounded bg-surface/30 flex items-center justify-center"
              >
                <span className="text-muted/40 text-xs">{t('partners.comingSoon')}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ═══ CTA ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Mail className="w-8 h-8 text-gold mx-auto mb-6" />
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-muted text-base max-w-xl mx-auto leading-relaxed mb-8">
            {t('cta.description')}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center bg-gold hover:bg-gold-light text-[var(--aigg-black)] font-semibold text-sm tracking-wide px-10 py-4 rounded transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,165,90,0.2)]"
          >
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </div>
  );
}
