import { getTranslations, setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.about' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'about' });

  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4 animate-fade-in-up">
            {t('tagline')}
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl text-cream font-semibold animate-fade-in-up delay-1">
            {t('heading')}
          </h1>
        </div>

        <div className="space-y-10 text-muted text-base leading-relaxed">
          {/* Story */}
          <section className="space-y-4">
            <p>{t('story.p1')}</p>
            <p>{t('story.p2')}</p>
          </section>

          <div className="gold-line" />

          {/* Kernöl */}
          <section className="space-y-4">
            <h2 className="font-[var(--font-heading)] text-2xl text-cream">
              {t('kernoel.title')}
            </h2>
            <p>{t('kernoel.p1')}</p>
            <p>
              {t('kernoel.p2')}
            </p>
          </section>

          {/* Kren */}
          <section className="space-y-4">
            <h2 className="font-[var(--font-heading)] text-2xl text-cream">
              {t('kren.title')}
            </h2>
            <p>{t('kren.p1')}</p>
          </section>

          <div className="gold-line" />

          {/* Values */}
          <section className="space-y-4">
            <h2 className="font-[var(--font-heading)] text-2xl text-cream">
              {t('values.title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
              <ValueCard
                title={t('values.directProducer.title')}
                text={t('values.directProducer.text')}
              />
              <ValueCard
                title={t('values.authenticOrigin.title')}
                text={t('values.authenticOrigin.text')}
              />
              <ValueCard
                title={t('values.traditionModern.title')}
                text={t('values.traditionModern.text')}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ValueCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-5 border border-border-gold rounded bg-surface">
      <h3 className="text-cream font-[var(--font-heading)] text-base mb-2">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{text}</p>
    </div>
  );
}
