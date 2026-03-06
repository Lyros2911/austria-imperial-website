import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  MapPin,
  Compass,
  Truck,
  Camera,
  Cpu,
  Globe,
  Activity,
  AlertTriangle,
  Radio,
  Laptop,
  Languages,
} from 'lucide-react';
import { ResearchAccordion } from '@/components/expedition/accordion';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'expedition.meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

const LANGUAGES = [
  'Deutsch', 'English', 'Slovenščina', 'Hrvatski', 'Bosanski', 'Shqip',
  'Ελληνικά', 'Italiano', 'Français', 'Español', 'Português', 'Nederlands',
  'Svenska', 'Norsk', 'Dansk', 'Suomi', 'Eesti', 'Latviešu', 'Lietuvių',
  'Polski', 'Čeština', 'Slovenčina', 'Magyar', 'Română', 'Български',
  'Türkçe', 'ქართული', 'Հայերեն', "O'zbek", 'Қазақ', 'Кыргызча',
  'Русский', '中文',
];

const PHASE_ICONS = [MapPin, Compass, Globe, Compass, MapPin, Compass];

export default async function ExpeditionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'expedition' });

  // Build research questions array from translations
  const questionIds = [
    'f1','f2','f3','f4','f5','f6','f7','f8','f9',
    'f10','f11','f12','f13','f14','f15',
    'f16','f17','f18',
    'f19','f20','f21',
  ];
  const questions = questionIds.map((fId) => ({
    id: t(`research.questions.${fId}.id`),
    category: t(`research.questions.${fId}.category`),
    question: t(`research.questions.${fId}.question`),
  }));

  const categoryLabels = {
    marketing: t('research.categories.marketing'),
    translation: t('research.categories.translation'),
    performance: t('research.categories.performance'),
    ai_landscape: t('research.categories.ai_landscape'),
  };

  const phases = ['phase1', 'phase2', 'phase3', 'phase4', 'phase5', 'phase6'] as const;

  const equipmentItems = [
    { key: 'antigravity', icon: Camera },
    { key: 'hovelair', icon: Camera },
    { key: 'insta360', icon: Camera },
    { key: 'sony', icon: Camera },
    { key: 'gopro', icon: Camera },
    { key: 'rode', icon: Radio },
    { key: 'macbook', icon: Laptop },
    { key: 'gimbal', icon: Camera },
    { key: 'thermomix', icon: Cpu },
    { key: 'garmin', icon: Activity },
  ] as const;

  const sponsoringCategories = [
    'sport', 'wearables', 'supplements', 'outdoor',
    'healthtech', 'food', 'telemedizin', 'bloodtest',
  ] as const;

  return (
    <div>
      {/* ═══ 1. Hero ═══ */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--aigg-black)] via-[#0d0c09] to-[var(--aigg-black)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(197,165,90,0.08)_0%,transparent_70%)]" />
        <div className="absolute top-1/4 left-0 right-0 gold-line opacity-20" />
        <div className="absolute bottom-1/3 left-0 right-0 gold-line opacity-10" />

        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
          <p className="text-gold/60 text-xs tracking-[0.4em] uppercase mb-8 animate-fade-in-up">
            {t('hero.tagline')}
          </p>

          <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-cream leading-[1.05] mb-6 animate-fade-in-up delay-1">
            <span className="text-gold-shimmer">{t('hero.title')}</span>
          </h1>

          <p className="text-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-12 animate-fade-in-up delay-2">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-3">
            <a
              href="#route"
              className="inline-flex items-center justify-center bg-gold hover:bg-gold-light text-[var(--aigg-black)] font-semibold text-sm tracking-wide px-10 py-4 rounded transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,165,90,0.2)]"
            >
              {t('hero.cta')}
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center border border-border-gold text-cream/70 hover:text-gold hover:border-gold/40 text-sm tracking-wide px-10 py-4 rounded transition-all duration-300"
            >
              {t('hero.ctaSecondary')}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-fade-in delay-5">
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-gold/30 to-transparent" />
        </div>
      </section>

      {/* ═══ 2. Route ═══ */}
      <section id="route" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {t('route.tagline')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-4">
              {t('route.title')}
            </h2>
            <p className="text-muted text-base max-w-2xl mx-auto">
              {t('route.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {phases.map((phase, i) => {
              const Icon = PHASE_ICONS[i];
              return (
                <div
                  key={phase}
                  className="p-5 border border-border-gold rounded bg-surface hover:border-gold/40 transition-colors duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="w-5 h-5 text-gold" />
                    <span className="text-gold/60 text-xs tracking-wider uppercase">
                      {t(`route.${phase}.months`)}
                    </span>
                  </div>
                  <h3 className="font-[var(--font-heading)] text-cream text-lg mb-2">
                    {t(`route.${phase}.title`)}
                  </h3>
                  <p className="text-muted text-sm mb-3 leading-relaxed">
                    {t(`route.${phase}.countries`)}
                  </p>
                  <p className="text-gold/70 text-xs leading-relaxed">
                    {t(`route.${phase}.focus`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* 3-Wellen-Studiendesign */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <p className="text-gold text-sm tracking-[0.2em] uppercase mb-4 text-center">
          {t('waves.tagline')}
        </p>
        <h2 className="text-3xl md:text-4xl font-[var(--font-heading)] text-cream text-center mb-4">
          {t('waves.title')}
        </h2>
        <p className="text-muted text-center max-w-2xl mx-auto mb-16">
          {t('waves.subtitle')}
        </p>

        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-gold/20 hidden md:block" />

          <div className="space-y-8">
            {(['wave1', 'base1', 'wave2', 'base2', 'wave3', 'conclusion'] as const).map((key, i) => {
              const isWave = key.startsWith('wave') || key === 'conclusion';
              return (
                <div key={key} className="relative md:pl-16">
                  {/* Timeline dot */}
                  <div className={`absolute left-4 top-6 w-5 h-5 rounded-full border-2 hidden md:block ${
                    isWave ? 'bg-gold border-gold' : 'bg-transparent border-gold/40'
                  }`} />

                  <div className={`p-6 rounded border ${
                    isWave
                      ? 'border-border-gold bg-surface'
                      : 'border-border-gold/30 bg-[var(--aigg-black)]'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                      <h3 className={`text-lg font-semibold ${isWave ? 'text-cream' : 'text-cream/70'}`}>
                        {t(`waves.items.${key}.title`)}
                      </h3>
                      <span className="text-xs text-gold/80 bg-gold/10 px-3 py-1 rounded-full whitespace-nowrap w-fit">
                        {t(`waves.items.${key}.period`)}
                      </span>
                    </div>
                    <p className="text-muted text-sm">
                      {t(`waves.items.${key}.description`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-gold/60 text-sm mt-12 italic">
          {t('waves.budget')}
        </p>
      </section>

      <div className="w-24 h-[1px] bg-gold/30 mx-auto" />

      {/* ═══ 3. Vehicles ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {t('vehicles.tagline')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold">
              {t('vehicles.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sprinter */}
            <div className="p-6 border border-border-gold rounded bg-surface">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="w-6 h-6 text-gold" />
                <div>
                  <h3 className="font-[var(--font-heading)] text-cream text-lg">
                    {t('vehicles.sprinter.title')}
                  </h3>
                  <span className="text-gold/60 text-xs">{t('vehicles.sprinter.driver')}</span>
                </div>
              </div>
              <div className="aspect-video bg-border/20 rounded mb-4 flex items-center justify-center">
                <Truck className="w-12 h-12 text-border-gold" />
              </div>
              <p className="text-muted text-sm leading-relaxed">
                {t('vehicles.sprinter.description')}
              </p>
            </div>

            {/* Off-road */}
            <div className="p-6 border border-border-gold rounded bg-surface">
              <div className="flex items-center gap-3 mb-4">
                <Compass className="w-6 h-6 text-gold" />
                <div>
                  <h3 className="font-[var(--font-heading)] text-cream text-lg">
                    {t('vehicles.offroad.title')}
                  </h3>
                  <span className="text-gold/60 text-xs">{t('vehicles.offroad.driver')}</span>
                </div>
              </div>
              <div className="aspect-video bg-border/20 rounded mb-4 flex items-center justify-center">
                <Compass className="w-12 h-12 text-border-gold" />
              </div>
              <p className="text-muted text-sm leading-relaxed">
                {t('vehicles.offroad.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ═══ 4. Equipment ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {t('equipment.tagline')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold">
              {t('equipment.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {equipmentItems.map(({ key, icon: EqIcon }) => (
              <div
                key={key}
                className="p-5 border border-border-gold rounded bg-surface text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                  <EqIcon className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-[var(--font-heading)] text-cream text-base mb-1">
                  {t(`equipment.${key}.title`)}
                </h3>
                <p className="text-gold/60 text-xs mb-3">{t(`equipment.${key}.spec`)}</p>
                <p className="text-muted text-sm leading-relaxed">
                  {t(`equipment.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ═══ 5. Research Questions ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {t('research.tagline')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold">
              {t('research.title')}
            </h2>
          </div>

          <ResearchAccordion items={questions} categoryLabels={categoryLabels} />
        </div>
      </section>

      <div className="gold-line" />

      {/* ═══ 6. AI Translation Study ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {t('translation_study.tagline')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-6">
              {t('translation_study.title')}
            </h2>
            <p className="text-muted text-base max-w-2xl mx-auto leading-relaxed">
              {t('translation_study.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="p-5 border border-border-gold rounded bg-surface">
              <div className="flex items-center gap-3 mb-3">
                <Cpu className="w-5 h-5 text-gold" />
                <h4 className="text-cream text-sm font-semibold">Tools</h4>
              </div>
              <p className="text-muted text-sm leading-relaxed">{t('translation_study.tools')}</p>
            </div>
            <div className="p-5 border border-border-gold rounded bg-surface">
              <div className="flex items-center gap-3 mb-3">
                <Languages className="w-5 h-5 text-gold" />
                <h4 className="text-cream text-sm font-semibold">Metrics</h4>
              </div>
              <p className="text-muted text-sm leading-relaxed">
                {t('translation_study.metrics')}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-center text-gold/60 text-xs tracking-[0.3em] uppercase mb-6">
              {t('translation_study.languagesTitle')}
            </h4>
            <div className="flex flex-wrap justify-center gap-2">
              {LANGUAGES.map((lang) => (
                <span
                  key={lang}
                  className="px-3 py-1.5 text-xs border border-border-gold rounded-full text-cream/70 bg-surface/50"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ═══ 7. Performance Module ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {t('performance.tagline')}
            </p>
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-6">
              {t('performance.title')}
            </h2>
            <p className="text-muted text-base max-w-2xl mx-auto leading-relaxed">
              {t('performance.description')}
            </p>
          </div>

          <div className="mb-10">
            <h4 className="text-center text-gold/60 text-xs tracking-[0.3em] uppercase mb-6">
              {t('performance.sponsoringTitle')}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {sponsoringCategories.map((cat) => (
                <div
                  key={cat}
                  className="p-4 border border-border-gold rounded bg-surface text-center"
                >
                  <Activity className="w-5 h-5 text-gold mx-auto mb-2" />
                  <span className="text-cream/80 text-xs">
                    {t(`performance.categories.${cat}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-muted text-sm">
            {t('performance.cta')}{' '}
            <Link href="/contact" className="text-gold hover:text-gold-light transition-colors">
              Contact &rarr;
            </Link>
          </p>
        </div>
      </section>

      <div className="gold-line" />

      {/* ═══ 8. Geopolitical Note ═══ */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="p-6 border border-border-gold/50 rounded bg-surface/50">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-gold/60 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-cream text-sm font-semibold mb-2">
                  {t('geopolitical.title')}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{t('geopolitical.text')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ═══ 9. Live Tracker Placeholder ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
            {t('tracker.tagline')}
          </p>
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-6">
            {t('tracker.title')}
          </h2>
          <p className="text-muted text-base max-w-xl mx-auto leading-relaxed mb-8">
            {t('tracker.description')}
          </p>

          <div className="p-8 border border-dashed border-border-gold rounded bg-surface/30">
            <Radio className="w-8 h-8 text-gold/40 mx-auto mb-4" />
            <p className="text-gold/50 text-sm">{t('tracker.comingSoon')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
