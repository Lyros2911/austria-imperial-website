'use client';

import { useState } from 'react';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

export default function ContactFormClient() {
  const [status, setStatus] = useState<FormStatus>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          subject: data.get('subject'),
          message: data.get('message'),
        }),
      });

      if (!res.ok) throw new Error('Failed');

      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="p-6 border border-green/30 rounded bg-green/5 text-center">
        <div className="text-3xl mb-3">✓</div>
        <h2 className="font-[var(--font-heading)] text-xl text-cream mb-2">
          Nachricht gesendet!
        </h2>
        <p className="text-muted text-sm">
          Vielen Dank für Ihre Nachricht. Wir melden uns innerhalb von 24 Stunden bei Ihnen.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-gold/80 hover:text-gold text-sm transition-colors"
        >
          Weitere Nachricht senden
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 border border-border-gold rounded bg-surface">
      <h2 className="font-[var(--font-heading)] text-xl text-cream mb-6">
        Nachricht senden
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Name" type="text" name="name" placeholder="Ihr Name" required />
        <FormField label="E-Mail" type="email" name="email" placeholder="ihre@email.com" required />
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
            required
            placeholder="Ihre Nachricht..."
            className="w-full bg-[var(--aigg-black)] border border-border-gold text-cream/80 text-sm rounded px-3 py-2.5 focus:outline-none focus:border-gold transition-colors resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full bg-gold hover:bg-gold-light text-[var(--aigg-black)] font-semibold text-sm tracking-wide px-6 py-3 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? 'Wird gesendet...' : 'Nachricht senden'}
        </button>

        {status === 'error' && (
          <p className="text-red-400 text-sm text-center">
            Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt an info@austriaimperial.com
          </p>
        )}

        <p className="text-muted/60 text-xs text-center">
          Mit dem Absenden stimmen Sie unserer{' '}
          <a href="/legal/datenschutz" className="text-gold/60 hover:text-gold transition-colors">
            Datenschutzerklärung
          </a>{' '}
          zu.
        </p>
      </form>
    </div>
  );
}

function FormField({
  label,
  type,
  name,
  placeholder,
  required,
}: {
  label: string;
  type: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-cream/80 text-sm mb-1">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[var(--aigg-black)] border border-border-gold text-cream/80 text-sm rounded px-3 py-2.5 focus:outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}
