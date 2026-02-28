'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

export default function ContactFormClient() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const t = useTranslations('contact.form');

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
          {t('success.title')}
        </h2>
        <p className="text-muted text-sm">
          {t('success.text')}
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-gold/80 hover:text-gold text-sm transition-colors"
        >
          {t('success.sendAnother')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 border border-border-gold rounded bg-surface">
      <h2 className="font-[var(--font-heading)] text-xl text-cream mb-6">
        {t('title')}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label={t('name')} type="text" name="name" placeholder={t('namePlaceholder')} required />
        <FormField label={t('email')} type="email" name="email" placeholder={t('emailPlaceholder')} required />
        <div>
          <label className="block text-cream/80 text-sm mb-1">{t('subject')}</label>
          <select
            name="subject"
            className="w-full bg-[var(--aigg-black)] border border-border-gold text-cream/80 text-sm rounded px-3 py-2.5 focus:outline-none focus:border-gold transition-colors"
          >
            <option value="general">{t('subjectGeneral')}</option>
            <option value="order">{t('subjectOrder')}</option>
            <option value="b2b">{t('subjectB2b')}</option>
            <option value="press">{t('subjectPress')}</option>
          </select>
        </div>
        <div>
          <label className="block text-cream/80 text-sm mb-1">{t('message')}</label>
          <textarea
            name="message"
            rows={5}
            required
            placeholder={t('messagePlaceholder')}
            className="w-full bg-[var(--aigg-black)] border border-border-gold text-cream/80 text-sm rounded px-3 py-2.5 focus:outline-none focus:border-gold transition-colors resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full bg-gold hover:bg-gold-light text-[var(--aigg-black)] font-semibold text-sm tracking-wide px-6 py-3 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? t('sending') : t('submit')}
        </button>

        {status === 'error' && (
          <p className="text-red-400 text-sm text-center">
            {t('error')}
          </p>
        )}

        <p className="text-muted/60 text-xs text-center">
          {t.rich('privacyConsent', {
            link: (chunks) => (
              <Link href="/legal/datenschutz" className="text-gold/60 hover:text-gold transition-colors">
                {chunks}
              </Link>
            ),
          })}
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
