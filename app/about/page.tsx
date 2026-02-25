import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Über Uns',
  description: 'Die Geschichte hinter Austria Imperial — authentische steirische Spezialitäten.',
};

export default function AboutPage() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4 animate-fade-in-up">
            Unsere Geschichte
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl text-cream font-semibold animate-fade-in-up delay-1">
            Grünes Gold aus der Steiermark
          </h1>
        </div>

        <div className="space-y-10 text-muted text-base leading-relaxed">
          {/* Story */}
          <section className="space-y-4">
            <p>
              Die Steiermark ist eine der faszinierendsten Genussregionen Europas.
              Sanfte Hügel, fruchtbare Böden und ein mildes Klima schaffen ideale
              Bedingungen für Produkte von außergewöhnlicher Qualität.
            </p>
            <p>
              <strong className="text-cream">Austria Imperial — Green Gold</strong>{' '}
              bringt diese Tradition direkt zu Ihnen: Steirisches Kürbiskernöl mit
              geschützter geographischer Angabe (g.g.A.) und handverlesener Kren
              aus traditionellem Anbau.
            </p>
          </section>

          {/* Divider */}
          <div className="gold-line" />

          {/* Kernöl */}
          <section className="space-y-4">
            <h2 className="font-[var(--font-heading)] text-2xl text-cream">
              Das Kürbiskernöl
            </h2>
            <p>
              Unser Kürbiskernöl stammt von der Ölmühle Kiendler in der Südsteiermark.
              Hier werden seit Generationen steirische Kürbiskerne nach überlieferter
              Tradition kaltgepresst. Das Ergebnis: ein tiefgrünes Öl mit intensivem,
              nussigem Aroma — das &quot;grüne Gold&quot; der Steiermark.
            </p>
            <p>
              Die EU-geschützte Herkunftsbezeichnung <strong className="text-gold">g.g.A.</strong>{' '}
              (geschützte geographische Angabe) garantiert, dass nur Öl aus der Steiermark
              diesen Namen tragen darf. Jede Flasche ist ein Stück authentischer
              österreichischer Genusskultur.
            </p>
          </section>

          {/* Kren */}
          <section className="space-y-4">
            <h2 className="font-[var(--font-heading)] text-2xl text-cream">
              Der Kren
            </h2>
            <p>
              Steirischer Kren (Meerrettich) von der Familie Hernach wird nach
              bewährten Methoden angebaut und frisch verarbeitet. Die scharfe Würze
              und das vollmundige Aroma machen ihn zu einem unverzichtbaren Begleiter
              der österreichischen Küche — ob zum Tafelspitz, auf dem Jausenbrett
              oder als Verfeinerung für Saucen.
            </p>
          </section>

          {/* Divider */}
          <div className="gold-line" />

          {/* Values */}
          <section className="space-y-4">
            <h2 className="font-[var(--font-heading)] text-2xl text-cream">
              Wofür wir stehen
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
              <ValueCard
                title="Direkt vom Erzeuger"
                text="Keine Zwischenhändler. Unsere Produkte kommen direkt von den Produzenten zu Ihnen."
              />
              <ValueCard
                title="Authentische Herkunft"
                text="EU-zertifizierte Qualität. Jedes Produkt ist rückverfolgbar bis zum Erzeuger."
              />
              <ValueCard
                title="Tradition trifft Moderne"
                text="Überlieferte Handwerkskunst, verpackt für die heutige Zeit."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ValueCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-5 border border-border-gold rounded bg-surface">
      <h3 className="text-cream font-[var(--font-heading)] text-base mb-2">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{text}</p>
    </div>
  );
}
