// TODO [NACH GmbH-REGISTRIERUNG]:
// "betrieben von Auryx AI LLC" → "betrieben von Austria Imperial Green Gold GmbH"
// Geschäftsführer: Gottfried Hammerl & Peter Kräcksammer (Gesamtvertretung)
// Strukturvereinbarung: 26.02.2026

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen',
  description: 'AGB von Austria Imperial — Green Gold.',
};

export default function AGBPage() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[var(--font-heading)] text-4xl text-cream font-semibold mb-12">
          Allgemeine Geschäftsbedingungen
        </h1>

        <div className="space-y-8 text-muted text-sm leading-relaxed">
          <Section title="§ 1 Geltungsbereich">
            <p>
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Bestellungen,
              die über den Online-Shop von Austria Imperial — Green Gold (betrieben von
              Auryx AI LLC, nachfolgend &quot;Anbieter&quot;) getätigt werden.
            </p>
            <p>
              Die AGB gelten in der zum Zeitpunkt der Bestellung gültigen Fassung.
              Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei denn,
              der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.
            </p>
          </Section>

          <Section title="§ 2 Vertragsschluss">
            <p>
              Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes
              Angebot, sondern eine Aufforderung zur Bestellung dar.
            </p>
            <p>
              Durch Anklicken des Bestell-Buttons geben Sie eine verbindliche Bestellung
              der im Warenkorb enthaltenen Waren ab. Die Bestätigung des Eingangs der
              Bestellung erfolgt unmittelbar nach dem Absenden per E-Mail (Bestellbestätigung).
            </p>
            <p>
              Der Kaufvertrag kommt zustande, wenn die Ware an den Versanddienstleister
              übergeben wird.
            </p>
          </Section>

          <Section title="§ 3 Preise und Versandkosten">
            <p>
              Alle angegebenen Preise sind Endpreise und verstehen sich inklusive der
              gesetzlichen Mehrwertsteuer, sofern anwendbar. Zusätzlich fallen
              Versandkosten an, die vor Abschluss der Bestellung deutlich angezeigt werden.
            </p>
          </Section>

          <Section title="§ 4 Zahlung">
            <p>
              Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Folgende
              Zahlungsarten stehen zur Verfügung: Kreditkarte (Visa, Mastercard),
              SEPA-Lastschrift und weitere von Stripe angebotene Zahlungsmethoden.
            </p>
            <p>
              Der Rechnungsbetrag wird bei Bestelleingang belastet.
            </p>
          </Section>

          <Section title="§ 5 Lieferung">
            <p>
              Die Lieferung erfolgt direkt durch unsere Produzenten an die vom Kunden
              angegebene Lieferadresse. Bei Bestellungen mit Produkten verschiedener
              Produzenten kann die Lieferung in mehreren Paketen erfolgen.
            </p>
            <p>
              Die Lieferzeit beträgt in der Regel 3–7 Werktage innerhalb der EU.
              Für Lieferungen außerhalb der EU können längere Lieferzeiten und
              zusätzliche Zollgebühren anfallen.
            </p>
          </Section>

          <Section title="§ 6 Eigentumsvorbehalt">
            <p>
              Die gelieferte Ware bleibt bis zur vollständigen Bezahlung des
              Kaufpreises Eigentum des Anbieters.
            </p>
          </Section>

          <Section title="§ 7 Gewährleistung">
            <p>
              Es gelten die gesetzlichen Gewährleistungsrechte. Lebensmittel sind
              vom Umtausch ausgeschlossen, sofern sie fehlerfrei und wie beschrieben
              geliefert wurden.
            </p>
            <p>
              Bitte prüfen Sie die Ware bei Lieferung unverzüglich auf erkennbare
              Mängel. Mängelrügen nehmen wir per E-Mail entgegen.
            </p>
          </Section>

          <Section title="§ 8 Haftung">
            <p>
              Für Schäden haftet der Anbieter nur bei Vorsatz und grober Fahrlässigkeit.
              Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung
              wesentlicher Vertragspflichten. Die Haftung ist auf den vertragstypischen,
              vorhersehbaren Schaden begrenzt.
            </p>
          </Section>

          <Section title="§ 9 Anwendbares Recht">
            <p>
              Es gilt das Recht der Republik Österreich unter Ausschluss des
              UN-Kaufrechts. Für Verbraucher innerhalb der EU bleiben die
              zwingenden Verbraucherschutzbestimmungen des jeweiligen Wohnsitzlandes
              unberührt.
            </p>
          </Section>

          <Section title="§ 10 Schlussbestimmungen">
            <p>
              Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden,
              bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.
            </p>
            <p className="mt-4 text-muted/60">
              Stand: Februar 2026
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
