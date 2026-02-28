// TODO [NACH GmbH-REGISTRIERUNG]:
// Aktuell steht "Auryx AI LLC" als Betreiber. Nach Eintragung der AIGG GmbH ersetzen durch:
// - Firma: Austria Imperial Green Gold GmbH
// - Sitz: [GmbH-Adresse nach Registrierung]
// - Geschäftsführer: Gottfried Hammerl & Peter Kräcksammer (Gesamtvertretung)
// - FN: [Firmenbuchnummer]
// - UID: [Umsatzsteuer-ID nach Anmeldung]
// Strukturvereinbarung: 26.02.2026

import { getTranslations, setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.impressum' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ImpressumPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'impressum' });

  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[var(--font-heading)] text-4xl text-cream font-semibold mb-12">
          {t('title')}
        </h1>

        <div className="prose-legal space-y-8 text-muted text-sm leading-relaxed">
          <Section title={t('s1.title')}>
            <p>
              <strong className="text-cream">{t('s1.company')}</strong>
              <br />
              {t('s1.operatorOf')}
            </p>
            <p>
              {t('s1.address').split('\n').map((line: string, i: number) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          </Section>

          <Section title={t('s2.title')}>
            <p>
              {t('s2.emailLabel')} {t('s2.email')}
              <br />
              {t('s2.webLabel')} {t('s2.web')}
            </p>
          </Section>

          <Section title={t('s3.title')}>
            <p>{t('s3.text')}</p>
          </Section>

          <Section title={t('s4.title')}>
            <p>{t('s4.text')}</p>
          </Section>

          <Section title={t('s5.title')}>
            <p>
              {t('s5.name')}
              <br />
              {t('s5.addressNote')}
            </p>
          </Section>

          <Section title={t('s6.title')}>
            <p>
              {t('s6.text1')}{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
              >
                {t('s6.link')}
              </a>
            </p>
            <p>{t('s6.text2')}</p>
          </Section>

          <Section title={t('s7.title')}>
            <p>{t('s7.text')}</p>
          </Section>

          <Section title={t('s8.title')}>
            <p>{t('s8.text')}</p>
          </Section>

          <Section title={t('s9.title')}>
            <p>{t('s9.text')}</p>
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
