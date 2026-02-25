import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum und Anbieterkennzeichnung von Austria Imperial — Green Gold.',
};

export default function ImpressumPage() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[var(--font-heading)] text-4xl text-cream font-semibold mb-12">
          Impressum
        </h1>

        <div className="prose-legal space-y-8 text-muted text-sm leading-relaxed">
          <Section title="Angaben gemäß § 5 TMG / § 25 MedienG">
            <p>
              <strong className="text-cream">Auryx AI LLC</strong>
              <br />
              Betreiber der Marke Austria Imperial — Green Gold
            </p>
            <p>
              30 N Gould St Ste N
              <br />
              Sheridan, WY 82801
              <br />
              United States of America
            </p>
          </Section>

          <Section title="Kontakt">
            <p>
              E-Mail: info@austriaimperial.com
              <br />
              Web: www.austriaimperial.com
            </p>
          </Section>

          <Section title="Vertretungsberechtigter">
            <p>
              Gottfried Hammerl, Managing Member
            </p>
          </Section>

          <Section title="Umsatzsteuer-Identifikationsnummer">
            <p>
              Wird nach Anmeldung beim Finanzamt ergänzt.
            </p>
          </Section>

          <Section title="Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV">
            <p>
              Gottfried Hammerl
              <br />
              (Anschrift wie oben)
            </p>
          </Section>

          <Section title="EU-Streitschlichtung">
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </Section>

          <Section title="Haftung für Inhalte">
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen
              Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir
              als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
              rechtswidrige Tätigkeit hinweisen.
            </p>
          </Section>

          <Section title="Haftung für Links">
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
              keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
              Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
              Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
          </Section>

          <Section title="Urheberrecht">
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
              unterliegen dem Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und
              jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
              schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
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
