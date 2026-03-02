// VEREIN-STRUKTUR (Stand: März 2026)
// Rechtsform: Verein nach VerG 2002
// Vollständiger Name: Austria Imperial Green Gold — Verein zur Erforschung KI-gestützter Vermarktung regionaler Spezialitäten
// ZVR-Zahl: [wird nach Gründung eingetragen]
// Obmann: Gottfried Hammerl | Kassier: Peter Kräcksammer

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
          {/* s1: Angaben gem. § 5 ECG */}
          <Section title={t('s1.title')}>
            <p>
              <strong className="text-cream">{t('s1.company')}</strong>
              <br />
              {t('s1.legalName')}
            </p>
            <p>{t('s1.zvr')}</p>
            <p>
              {t('s1.address').split('\n').map((line: string, i: number) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          </Section>

          {/* s2: Kontakt */}
          <Section title={t('s2.title')}>
            <p>
              {t('s2.emailLabel')} {t('s2.email')}
              <br />
              {t('s2.webLabel')} {t('s2.web')}
            </p>
          </Section>

          {/* s3: Vorstand */}
          <Section title={t('s3.title')}>
            <p>
              {t('s3.obmann')}
              <br />
              {t('s3.kassier')}
            </p>
            <p className="text-xs text-muted/70">{t('s3.vertretung')}</p>
          </Section>

          {/* s4: Vereinszweck */}
          <Section title={t('s4.title')}>
            <p>{t('s4.text')}</p>
          </Section>

          {/* s5: Umsatzsteuer */}
          <Section title={t('s5.title')}>
            <p>{t('s5.text')}</p>
          </Section>

          {/* s6: Verantwortlich für Inhalt */}
          <Section title={t('s6.title')}>
            <p>
              {t('s6.name')}
              <br />
              {t('s6.addressNote')}
            </p>
          </Section>

          {/* s7: EU-Streitschlichtung */}
          <Section title={t('s7.title')}>
            <p>
              {t('s7.text1')}{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
              >
                {t('s7.link')}
              </a>
            </p>
            <p>{t('s7.text2')}</p>
          </Section>

          {/* s8: Haftung für Inhalte */}
          <Section title={t('s8.title')}>
            <p>{t('s8.text')}</p>
          </Section>

          {/* s9: Haftung für Links */}
          <Section title={t('s9.title')}>
            <p>{t('s9.text')}</p>
          </Section>

          {/* s10: Urheberrecht */}
          <Section title={t('s10.title')}>
            <p>{t('s10.text')}</p>
          </Section>

          {/* s11: Anwendbares Recht */}
          <Section title={t('s11.title')}>
            <p>{t('s11.text')}</p>
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
