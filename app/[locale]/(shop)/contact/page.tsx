import { getTranslations, setRequestLocale } from 'next-intl/server';
import ContactFormClient from './contact-form';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.contact' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'contact' });

  return (
    <div className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4 animate-fade-in-up">
            {t('tagline')}
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl text-cream font-semibold animate-fade-in-up delay-1">
            {t('heading')}
          </h1>
          <p className="text-muted text-base max-w-xl mx-auto mt-6 leading-relaxed animate-fade-in-up delay-2">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <ContactBlock
              title={t('email.title')}
              content={t('email.content')}
              detail={t('email.detail')}
            />
            <ContactBlock
              title={t('b2b.title')}
              content={t('b2b.content')}
              detail={t('b2b.detail')}
            />
            <ContactBlock
              title={t('operator.title')}
              content={t('operator.content')}
              detail={t('operator.detail')}
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
