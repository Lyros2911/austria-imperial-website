import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Kontaktieren Sie Austria Imperial — Green Gold. Wir freuen uns auf Ihre Nachricht.',
};

export default function ContactPage() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4 animate-fade-in-up">
            Kontakt
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl text-cream font-semibold animate-fade-in-up delay-1">
            Sprechen Sie uns an
          </h1>
          <p className="text-muted text-base max-w-xl mx-auto mt-6 leading-relaxed animate-fade-in-up delay-2">
            Fragen zu unseren Produkten, Großbestellungen oder Kooperationen?
            Wir freuen uns auf Ihre Nachricht.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <ContactBlock
              title="E-Mail"
              content="info@austriaimperial.com"
              detail="Wir antworten in der Regel innerhalb von 24 Stunden."
            />
            <ContactBlock
              title="Für Geschäftskunden"
              content="B2B-Anfragen willkommen"
              detail="Restaurants, Feinkostläden und Händler — kontaktieren Sie uns für individuelle Angebote und Konditionen."
            />
            <ContactBlock
              title="Betreiber"
              content="Auryx AI LLC"
              detail="30 N Gould St Ste N, Sheridan, WY 82801, USA"
            />
          </div>

          {/* Contact Form */}
          <div className="p-6 border border-border-gold rounded bg-surface">
            <h2 className="font-[var(--font-heading)] text-xl text-cream mb-6">
              Nachricht senden
            </h2>
            <form className="space-y-4">
              <FormField label="Name" type="text" name="name" placeholder="Ihr Name" />
              <FormField label="E-Mail" type="email" name="email" placeholder="ihre@email.com" />
              <div>
                <label className="block text-cream/80 text-sm mb-1">Betreff</label>
                <select
                  name="subject"
                  className="w-full bg-[var(--aigg-black)] border border-border-gold text-cream/80 text-sm rounded px-3 py-2.5 focus:outline-none focus:border-gold transition-colors"
                >
                  <option value="general">Allgemeine Anfrage</option>
                  <option value="order">Frage zu einer Bestellung</option>
                  <option value="b2b">Geschäftskunde / B2B</option>
                  <option value="press">Presse / Kooperation</option>
                </select>
              </div>
              <div>
                <label className="block text-cream/80 text-sm mb-1">Nachricht</label>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Ihre Nachricht..."
                  className="w-full bg-[var(--aigg-black)] border border-border-gold text-cream/80 text-sm rounded px-3 py-2.5 focus:outline-none focus:border-gold transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gold hover:bg-gold-light text-[var(--aigg-black)] font-semibold text-sm tracking-wide px-6 py-3 rounded transition-all duration-300"
              >
                Nachricht senden
              </button>
              <p className="text-muted/60 text-xs text-center">
                Mit dem Absenden stimmen Sie unserer{' '}
                <a href="/legal/datenschutz" className="text-gold/60 hover:text-gold transition-colors">
                  Datenschutzerklärung
                </a>{' '}
                zu.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactBlock({ title, content, detail }: { title: string; content: string; detail: string }) {
  return (
    <div>
      <h3 className="text-cream/60 text-xs tracking-[0.2em] uppercase mb-1">{title}</h3>
      <p className="text-cream font-[var(--font-heading)] text-lg">{content}</p>
      <p className="text-muted text-sm mt-1">{detail}</p>
    </div>
  );
}

function FormField({
  label,
  type,
  name,
  placeholder,
}: {
  label: string;
  type: string;
  name: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-cream/80 text-sm mb-1">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        className="w-full bg-[var(--aigg-black)] border border-border-gold text-cream/80 text-sm rounded px-3 py-2.5 focus:outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}
