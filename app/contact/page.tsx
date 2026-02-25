import type { Metadata } from 'next';
import ContactFormClient from './contact-form';

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

          {/* Contact Form (Client Component) */}
          <ContactFormClient />
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
