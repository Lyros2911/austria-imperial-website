import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Widerrufsbelehrung',
  description: 'Widerrufsbelehrung von Austria Imperial — Green Gold.',
};

export default function WiderrufPage() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[var(--font-heading)] text-4xl text-cream font-semibold mb-12">
          Widerrufsbelehrung
        </h1>

        <div className="space-y-8 text-muted text-sm leading-relaxed">
          <Section title="Widerrufsrecht">
            <p>
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen
              diesen Vertrag zu widerrufen.
            </p>
            <p>
              Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder
              ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die
              Waren in Besitz genommen haben bzw. hat.
            </p>
            <p>
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer
              eindeutigen Erklärung (z.&nbsp;B. per E-Mail) über Ihren Entschluss,
              diesen Vertrag zu widerrufen, informieren:
            </p>
            <p className="text-cream/80">
              Auryx AI LLC
              <br />
              E-Mail: info@austriaimperial.com
            </p>
            <p>
              Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung
              über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist
              absenden.
            </p>
          </Section>

          <Section title="Folgen des Widerrufs">
            <p>
              Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen,
              die wir von Ihnen erhalten haben, einschließlich der Lieferkosten
              (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben,
              dass Sie eine andere Art der Lieferung als die von uns angebotene,
              günstigste Standardlieferung gewählt haben), unverzüglich und
              spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem
              die Mitteilung über Ihren Widerruf dieses Vertrags bei uns
              eingegangen ist.
            </p>
            <p>
              Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das
              Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn,
              mit Ihnen wurde ausdrücklich etwas anderes vereinbart. In keinem Fall
              werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
            </p>
            <p>
              Wir können die Rückzahlung verweigern, bis wir die Waren wieder
              zurückerhalten haben oder bis Sie den Nachweis erbracht haben,
              dass Sie die Waren zurückgesandt haben, je nachdem, welches der
              frühere Zeitpunkt ist.
            </p>
          </Section>

          <Section title="Rücksendung">
            <p>
              Sie haben die Waren unverzüglich und in jedem Fall spätestens
              binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf
              dieses Vertrags unterrichten, an uns zurückzusenden oder zu
              übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf
              der Frist von vierzehn Tagen absenden.
            </p>
            <p>
              Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.
            </p>
          </Section>

          <Section title="Ausschluss des Widerrufsrechts">
            <p>
              Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von
              Waren, die schnell verderben können oder deren Verfallsdatum
              schnell überschritten würde.
            </p>
            <p>
              Das Widerrufsrecht erlischt bei Verträgen zur Lieferung
              versiegelter Waren, die aus Gründen des Gesundheitsschutzes
              oder der Hygiene nicht zur Rückgabe geeignet sind, wenn ihre
              Versiegelung nach der Lieferung entfernt wurde.
            </p>
            <p>
              <strong className="text-cream/80">Hinweis:</strong> Bei
              Lebensmitteln (Kürbiskernöl, Kren) ist das Widerrufsrecht
              ausgeschlossen, sobald die Versiegelung der Flasche/des Glases
              geöffnet wurde.
            </p>
          </Section>

          <Section title="Muster-Widerrufsformular">
            <p className="text-muted/60 italic">
              Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses
              Formular aus und senden Sie es zurück:
            </p>
            <div className="mt-3 p-4 border border-border-gold rounded bg-surface text-muted/80 text-xs">
              <p>An: Auryx AI LLC, info@austriaimperial.com</p>
              <p className="mt-2">
                Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
                Vertrag über den Kauf der folgenden Waren:
              </p>
              <p className="mt-1">Bestellt am / erhalten am (*): _______________</p>
              <p>Name des/der Verbraucher(s): _______________</p>
              <p>Anschrift des/der Verbraucher(s): _______________</p>
              <p className="mt-2">Datum: _______________</p>
              <p className="mt-2 text-muted/50">(*) Unzutreffendes streichen.</p>
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
