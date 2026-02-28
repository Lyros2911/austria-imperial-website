// TODO [NACH GmbH-REGISTRIERUNG]:
// Verantwortliche Stelle: Auryx AI LLC → Austria Imperial Green Gold GmbH
// Geschäftsführer: Gottfried Hammerl & Peter Kräcksammer (Gesamtvertretung)
// Adresse: [GmbH-Adresse nach Registrierung]
// Strukturvereinbarung: 26.02.2026

import { getTranslations, setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.datenschutz' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function DatenschutzPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'datenschutz' });

  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[var(--font-heading)] text-4xl text-cream font-semibold mb-12">
          {t('title')}
        </h1>

        <div className="space-y-8 text-muted text-sm leading-relaxed">
          <Section title={t('s1.title')}>
            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">{t('s1.generalTitle')}</h3>
            <p>{t('s1.generalText')}</p>

            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">{t('s1.collectionTitle')}</h3>
            <p>{t('s1.collectionText1')}</p>
            <p>{t('s1.collectionText2')}</p>
          </Section>

          <Section title={t('s2.title')}>
            <p>
              <strong className="text-cream">{t('s2.company')}</strong>
              <br />
              {t('s2.address').split('\n').map((line: string, i: number) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
              <br />
              {t('s2.emailLabel')} {t('s2.email')}
            </p>
            <p>{t('s2.text')}</p>
          </Section>

          <Section title={t('s3.title')}>
            <p>{t('s3.intro')}</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>{t('s3.rights.0')}</li>
              <li>{t('s3.rights.1')}</li>
              <li>{t('s3.rights.2')}</li>
              <li>{t('s3.rights.3')}</li>
              <li>{t('s3.rights.4')}</li>
              <li>{t('s3.rights.5')}</li>
              <li>{t('s3.rights.6')}</li>
            </ul>
            <p className="mt-2">{t('s3.outro')}</p>
          </Section>

          <Section title={t('s4.title')}>
            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">{t('s4.serverLogsTitle')}</h3>
            <p>{t('s4.serverLogsText1')}</p>
            <p>{t('s4.serverLogsText2')}</p>

            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">{t('s4.cookiesTitle')}</h3>
            <p>{t('s4.cookiesText')}</p>
          </Section>

          <Section title={t('s5.title')}>
            <p>{t('s5.text1')}</p>
            <p>
              {t('s5.text2')}{' '}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
              >
                {t('s5.stripeLink')}
              </a>
            </p>
          </Section>

          <Section title={t('s6.title')}>
            <p>{t('s6.text1')}</p>
            <p>{t('s6.text2')}</p>
          </Section>

          <Section title={t('s7.title')}>
            <p>{t('s7.text')}</p>
          </Section>

          <Section title={t('s8.title')}>
            <p>{t('s8.text')}</p>
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
