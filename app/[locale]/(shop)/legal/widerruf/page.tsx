// TODO [NACH GmbH-REGISTRIERUNG]:
// "Auryx AI LLC" → "Austria Imperial Green Gold GmbH"
// Adresse: [GmbH-Adresse nach Registrierung]
// Strukturvereinbarung: 26.02.2026

import { getTranslations, setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.widerruf' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function WiderrufPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'widerruf' });

  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[var(--font-heading)] text-4xl text-cream font-semibold mb-12">
          {t('title')}
        </h1>

        <div className="space-y-8 text-muted text-sm leading-relaxed">
          <Section title={t('s1.title')}>
            <p>{t('s1.p1')}</p>
            <p>{t('s1.p2')}</p>
            <p>{t('s1.p3')}</p>
            <p className="text-cream/80">
              {t('s1.contact').split('\n').map((line: string, i: number) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
            <p>{t('s1.p4')}</p>
          </Section>

          <Section title={t('s2.title')}>
            <p>{t('s2.p1')}</p>
            <p>{t('s2.p2')}</p>
            <p>{t('s2.p3')}</p>
          </Section>

          <Section title={t('s3.title')}>
            <p>{t('s3.p1')}</p>
            <p>{t('s3.p2')}</p>
          </Section>

          <Section title={t('s4.title')}>
            <p>{t('s4.p1')}</p>
            <p>{t('s4.p2')}</p>
            <p>
              <strong className="text-cream/80">{t('s4.p3note')}</strong> {t('s4.p3')}
            </p>
          </Section>

          <Section title={t('s5.title')}>
            <p className="text-muted/60 italic">
              {t('s5.intro')}
            </p>
            <div className="mt-3 p-4 border border-border-gold rounded bg-surface text-muted/80 text-xs">
              <p>{t('s5.to')}</p>
              <p className="mt-2">{t('s5.body')}</p>
              <p className="mt-1">{t('s5.orderedOn')}</p>
              <p>{t('s5.consumerName')}</p>
              <p>{t('s5.consumerAddress')}</p>
              <p className="mt-2">{t('s5.date')}</p>
              <p className="mt-2 text-muted/50">{t('s5.footnote')}</p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-cream font-[var(--font-heading)] text-lg mb-3">{title}</h2>
      {children}
    </section>
  );
}
