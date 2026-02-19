/**
 * Contact Form Emails — Austria Imperial Green Gold
 *
 * 1. Notification → info@austriaimperial.com (du bekommst die Anfrage)
 * 2. Confirmation → der Absender (Bestätigung dass wir die Anfrage erhalten haben)
 */

import { sendEmail, AIGG_FROM_EMAIL, AIGG_NOTIFICATION_EMAIL } from './resend';

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
    to: AIGG_NOTIFICATION_EMAIL,
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
 */
export async function sendContactConfirmation(data: ContactFormData): Promise<boolean> {
  return sendEmail({
    to: data.email,
    subject: 'Ihre Anfrage bei Austria Imperial — Green Gold',
    text: [
      `Guten Tag ${data.name},`,
      ``,
      `vielen Dank für Ihre Nachricht! Wir haben Ihre Anfrage erhalten und melden uns innerhalb von 24 Stunden bei Ihnen.`,
      ``,
      `Mit freundlichen Grüßen,`,
      `Ihr Austria Imperial Team`,
      ``,
      `---`,
      `Austria Imperial — Green Gold`,
      `Premium Steirisches Kürbiskernöl & Kren`,
      `https://austriaimperial.com`,
    ].join('\n'),
  });
}
