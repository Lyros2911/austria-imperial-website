/**
 * Contact Form Emails — Austria Imperial Green Gold
 *
 * 1. Notification → info@austriaimperial.com (du bekommst die Anfrage)
 * 2. Confirmation → der Absender (Bestätigung dass wir die Anfrage erhalten haben)
 */

import { sendEmail, AIGG_FROM_EMAIL, AIGG_NOTIFICATION_EMAILS } from './resend';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const SUBJECT_LABELS: Record<string, string> = {
  general: 'Allgemeine Anfrage',
  order: 'Frage zu einer Bestellung',
  b2b: 'Geschäftskunde / B2B',
  press: 'Presse / Kooperation',
};

/**
 * Notify info@austriaimperial.com about a new contact form submission.
 */
export async function sendContactNotification(data: ContactFormData): Promise<boolean> {
  const subjectLabel = SUBJECT_LABELS[data.subject] ?? data.subject;

  return sendEmail({
    to: AIGG_NOTIFICATION_EMAILS,
    replyTo: data.email,
    subject: `[AIGG Kontakt] ${subjectLabel} — ${data.name}`,
    text: [
      `════════════════════════════════════════`,
      `  NEUE KONTAKTANFRAGE`,
      `  Austria Imperial — Green Gold`,
      `════════════════════════════════════════`,
      ``,
      `Name:    ${data.name}`,
      `E-Mail:  ${data.email}`,
      `Betreff: ${subjectLabel}`,
      ``,
      `── NACHRICHT ──────────────────────────`,
      ``,
      data.message,
      ``,
      `════════════════════════════════════════`,
      `Antworten: Einfach auf diese E-Mail antworten.`,
      `════════════════════════════════════════`,
    ].join('\n'),
  });
}

/**
 * Send a confirmation email to the person who submitted the form.
 * Locale-aware: DE, EN, or AR response based on the user's language.
 */

const CONFIRMATION_TEMPLATES: Record<string, { subject: string; body: (name: string) => string }> = {
  de: {
    subject: 'Ihre Anfrage bei Austria Imperial — Green Gold',
    body: (name) => [
      `Guten Tag ${name},`,
      ``,
      `vielen Dank fuer Ihre Nachricht! Wir haben Ihre Anfrage erhalten und melden uns innerhalb von 24 Stunden bei Ihnen.`,
      ``,
      `Mit freundlichen Gruessen,`,
      `Ihr Austria Imperial Team`,
    ].join('\n'),
  },
  en: {
    subject: 'Your Inquiry — Austria Imperial Green Gold',
    body: (name) => [
      `Dear ${name},`,
      ``,
      `Thank you for your message! We have received your inquiry and will get back to you within 24 hours.`,
      ``,
      `Kind regards,`,
      `The Austria Imperial Team`,
    ].join('\n'),
  },
  ar: {
    subject: 'Austria Imperial Green Gold — استفسارك',
    body: (name) => [
      `${name} عزيزي`,
      ``,
      `شكرا لرسالتك! لقد تلقينا استفسارك وسنعود إليك في غضون 24 ساعة.`,
      ``,
      `مع أطيب التحيات`,
      `فريق Austria Imperial`,
    ].join('\n'),
  },
};

export async function sendContactConfirmation(data: ContactFormData, locale: string = 'de'): Promise<boolean> {
  const tpl = CONFIRMATION_TEMPLATES[locale] || CONFIRMATION_TEMPLATES.de;

  return sendEmail({
    to: data.email,
    subject: tpl.subject,
    text: [
      tpl.body(data.name),
      ``,
      `---`,
      `Austria Imperial — Green Gold`,
      `Premium Steirisches Kuerbiskernoel & Kren`,
      `https://austriaimperial.com`,
    ].join('\n'),
  });
}
