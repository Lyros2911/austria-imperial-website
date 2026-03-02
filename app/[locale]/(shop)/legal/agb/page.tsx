// VEREIN-STRUKTUR (Stand: März 2026)
// Vertragspartner: Austria Imperial Green Gold — Verein zur Erforschung KI-gestützter Vermarktung regionaler Spezialitäten
// Vertretung: Vorstand (Obmann + Kassier)
// Produktverkauf = Nebenzweckprivileg gem. § 1 Abs. 2 VerG

import { getTranslations, setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.agb' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AGBPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'agb' });

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
            <p className="italic text-muted/80">{t('s1.p3')}</p>
          </Section>

          <Section title={t('s2.title')}>
            <p>{t('s2.p1')}</p>
            <p>{t('s2.p2')}</p>
            <p>{t('s2.p3')}</p>
          </Section>

          <Section title={t('s3.title')}>
            <p>{t('s3.p1')}</p>
          </Section>

          <Section title={t('s4.title')}>
            <p>{t('s4.p1')}</p>
            <p>{t('s4.p2')}</p>
          </Section>

          <Section title={t('s5.title')}>
            <p>{t('s5.p1')}</p>
            <p>{t('s5.p2')}</p>
          </Section>

          <Section title={t('s6.title')}>
            <p>{t('s6.p1')}</p>
          </Section>

          <Section title={t('s7.title')}>
            <p>{t('s7.p1')}</p>
            <p>{t('s7.p2')}</p>
          </Section>

          <Section title={t('s8.title')}>
            <p>{t('s8.p1')}</p>
          </Section>

          <Section title={t('s9.title')}>
            <p>{t('s9.p1')}</p>
          </Section>

          <Section title={t('s10.title')}>
            <p>{t('s10.p1')}</p>
          </Section>

          <Section title={t('s11.title')}>
            <p>{t('s11.p1')}</p>
            <p className="mt-4 text-muted/60">
              {t('s11.date')}
            </p>
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
