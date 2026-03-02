// VEREIN-STRUKTUR (Stand: März 2026)
// Verantwortliche Stelle: Austria Imperial Green Gold — Verein
// Auftragsverarbeiter: Auryx AI LLC (AV-Vertrag gem. Art. 28 DSGVO)
// Neuer Abschnitt: Daten im Rahmen der Feldstudie
// Löschkonzept: Kunden 7J, Interessenten 2J, Studienteilnehmer → Anonymisierung

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
          {/* s1: Datenschutz auf einen Blick */}
          <Section title={t('s1.title')}>
            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">{t('s1.generalTitle')}</h3>
            <p>{t('s1.generalText')}</p>

            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">{t('s1.collectionTitle')}</h3>
            <p>{t('s1.collectionText1')}</p>
            <p>{t('s1.collectionText2')}</p>
          </Section>

          {/* s2: Verantwortliche Stelle */}
          <Section title={t('s2.title')}>
            <p>
              <strong className="text-cream">{t('s2.company')}</strong>
              <br />
              {t('s2.legalName')}
            </p>
            <p>{t('s2.zvr')}</p>
            <p>
              {t('s2.address').split('\n').map((line: string, i: number) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
              <br />
              {t('s2.obmann')}
              <br />
              {t('s2.emailLabel')} {t('s2.email')}
            </p>
            <p>{t('s2.text')}</p>
          </Section>

          {/* s3: Auftragsverarbeiter */}
          <Section title={t('s3.title')}>
            <p>{t('s3.text1')}</p>
            <p>{t('s3.text2')}</p>
            <p className="text-xs text-muted/70">{t('s3.auryx')}</p>
          </Section>

          {/* s4: Ihre Rechte */}
          <Section title={t('s4.title')}>
            <p>{t('s4.intro')}</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>{t('s4.rights.0')}</li>
              <li>{t('s4.rights.1')}</li>
              <li>{t('s4.rights.2')}</li>
              <li>{t('s4.rights.3')}</li>
              <li>{t('s4.rights.4')}</li>
              <li>{t('s4.rights.5')}</li>
              <li>{t('s4.rights.6')}</li>
              <li>{t('s4.rights.7')}</li>
            </ul>
            <p className="mt-2">{t('s4.outro')}</p>
          </Section>

          {/* s5: Datenerfassung */}
          <Section title={t('s5.title')}>
            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">{t('s5.serverLogsTitle')}</h3>
            <p>{t('s5.serverLogsText1')}</p>
            <p>{t('s5.serverLogsText2')}</p>

            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">{t('s5.cookiesTitle')}</h3>
            <p>{t('s5.cookiesText')}</p>
          </Section>

          {/* s6: Bestellungen und Zahlungsabwicklung */}
          <Section title={t('s6.title')}>
            <p>{t('s6.text1')}</p>
            <p>
              {t('s6.text2')}{' '}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
              >
                {t('s6.stripeLink')}
              </a>
            </p>
          </Section>

          {/* s7: Daten im Rahmen der Feldstudie (NEU) */}
          <Section title={t('s7.title')}>
            <p>{t('s7.text1')}</p>
            <p>{t('s7.text2')}</p>
            <p>{t('s7.text3')}</p>
            <p>{t('s7.text4')}</p>
          </Section>

          {/* s8: Weitergabe an Dritte */}
          <Section title={t('s8.title')}>
            <p>{t('s8.text1')}</p>
            <p>{t('s8.text2')}</p>
            <p>{t('s8.text3')}</p>
          </Section>

          {/* s9: Datenspeicherung und Löschkonzept */}
          <Section title={t('s9.title')}>
            <p>{t('s9.text1')}</p>
            <p>{t('s9.text2')}</p>
            <p>{t('s9.text3')}</p>
            <p>{t('s9.text4')}</p>
          </Section>

          {/* s10: SSL/TLS */}
          <Section title={t('s10.title')}>
            <p>{t('s10.text')}</p>
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
