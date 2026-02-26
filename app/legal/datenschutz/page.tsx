// TODO [NACH GmbH-REGISTRIERUNG]:
// Verantwortliche Stelle: Auryx AI LLC → Austria Imperial Green Gold GmbH
// Geschäftsführer: Gottfried Hammerl & Peter Kräcksammer (Gesamtvertretung)
// Adresse: [GmbH-Adresse nach Registrierung]
// Strukturvereinbarung: 26.02.2026

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung von Austria Imperial — Green Gold.',
};

export default function DatenschutzPage() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[var(--font-heading)] text-4xl text-cream font-semibold mb-12">
          Datenschutzerklärung
        </h1>

        <div className="space-y-8 text-muted text-sm leading-relaxed">
          <Section title="1. Datenschutz auf einen Blick">
            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">Allgemeine Hinweise</h3>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
              personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene
              Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>

            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">Datenerfassung auf dieser Website</h3>
            <p>
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber.
              Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
            </p>
            <p>
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen
              (z.&nbsp;B. in einem Bestellformular). Andere Daten werden automatisch oder nach
              Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst.
              Das sind vor allem technische Daten (z.&nbsp;B. Internetbrowser, Betriebssystem
              oder Uhrzeit des Seitenaufrufs).
            </p>
          </Section>

          <Section title="2. Verantwortliche Stelle">
            <p>
              <strong className="text-cream">Auryx AI LLC</strong>
              <br />
              30 N Gould St Ste N
              <br />
              Sheridan, WY 82801, USA
              <br />
              E-Mail: info@austriaimperial.com
            </p>
            <p>
              Verantwortliche Stelle ist die natürliche oder juristische Person, die allein
              oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von
              personenbezogenen Daten entscheidet.
            </p>
          </Section>

          <Section title="3. Ihre Rechte">
            <p>Sie haben jederzeit das Recht:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Auskunft über Ihre gespeicherten personenbezogenen Daten zu erhalten</li>
              <li>Berichtigung unrichtiger Daten zu verlangen</li>
              <li>Löschung Ihrer Daten zu verlangen</li>
              <li>Einschränkung der Verarbeitung zu verlangen</li>
              <li>Datenübertragbarkeit zu verlangen</li>
              <li>Widerspruch gegen die Verarbeitung einzulegen</li>
              <li>Eine erteilte Einwilligung zu widerrufen</li>
            </ul>
            <p className="mt-2">
              Hierzu sowie bei weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit
              an uns wenden.
            </p>
          </Section>

          <Section title="4. Datenerfassung auf dieser Website">
            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">Server-Log-Dateien</h3>
            <p>
              Der Provider der Seiten erhebt und speichert automatisch Informationen in
              sogenannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt.
              Dies sind: Browsertyp und -version, verwendetes Betriebssystem, Referrer-URL,
              Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage und IP-Adresse.
            </p>
            <p>
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
              Grundlage für die Datenverarbeitung ist Art. 6 Abs. 1 lit. f DSGVO.
            </p>

            <h3 className="text-cream/80 text-sm font-medium mt-4 mb-2">Cookies</h3>
            <p>
              Diese Website verwendet keine Tracking-Cookies. Wir setzen ausschließlich
              technisch notwendige Cookies ein, die für den Betrieb der Seite erforderlich
              sind (z.&nbsp;B. Warenkorb, Session).
            </p>
          </Section>

          <Section title="5. Bestellungen und Zahlungsabwicklung">
            <p>
              Wenn Sie bei uns bestellen, erheben wir folgende Daten: Name, E-Mail-Adresse,
              Lieferadresse, Rechnungsadresse und Bestelldetails. Diese Daten sind zur
              Vertragserfüllung erforderlich (Art. 6 Abs. 1 lit. b DSGVO).
            </p>
            <p>
              Die Zahlungsabwicklung erfolgt über <strong className="text-cream">Stripe, Inc.</strong>{' '}
              (510 Townsend Street, San Francisco, CA 94103, USA). Wir erhalten von Stripe
              keine vollständigen Zahlungsdaten (z.&nbsp;B. Kreditkartennummern). Stripe
              verarbeitet Ihre Zahlungsdaten gemäß deren Datenschutzerklärung:{' '}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
              >
                stripe.com/privacy
              </a>
            </p>
          </Section>

          <Section title="6. Weitergabe an Dritte">
            <p>
              Ihre Daten werden an unsere Fulfillment-Partner (Produzenten) weitergegeben,
              soweit dies zur Vertragserfüllung (Lieferung) notwendig ist. Dies umfasst:
              Name, Lieferadresse und Bestelldetails.
            </p>
            <p>
              Eine darüber hinausgehende Weitergabe an Dritte findet nicht statt, es sei denn,
              wir sind gesetzlich dazu verpflichtet.
            </p>
          </Section>

          <Section title="7. Datenspeicherung">
            <p>
              Bestelldaten werden für die Dauer der gesetzlichen Aufbewahrungsfristen
              gespeichert (in der Regel 7 Jahre gemäß Handels- und Steuerrecht).
              Nach Ablauf der Fristen werden die Daten gelöscht.
            </p>
          </Section>

          <Section title="8. SSL/TLS-Verschlüsselung">
            <p>
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung
              vertraulicher Inhalte eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte
              Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von
              &quot;http://&quot; auf &quot;https://&quot; wechselt.
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
