/**
 * Resend Email Client — Austria Imperial Green Gold
 *
 * Zentraler E-Mail-Versand für:
 * - Kontaktformular-Benachrichtigungen (an info@austriaimperial.com)
 * - Kontaktformular-Bestätigungen (an den Absender)
 * - Bestellbestätigungen (an Kunden)
 * - Producer-Bestellungen (an Kiendler/Hernach)
 *
 * Ersetzt Nodemailer — Resend ist HTTP-basiert,
 * zuverlässiger in Serverless/Docker Environments.
 *
 * ENV: RESEND_API_KEY
 */

import { Resend } from 'resend';

// Lazy init — only created on first use, not at import time (build-safe).
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const AIGG_FROM_EMAIL = 'Austria Imperial <noreply@austriaimperial.com>';
export const AIGG_NOTIFICATION_EMAIL = 'office@austriaimperial.com';

interface SendEmailParams {
  from?: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email via Resend.
 *
 * Returns true on success, false on failure.
 * Never throws — caller doesn't need try/catch.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const { error } = await getResend().emails.send({
      from: params.from ?? AIGG_FROM_EMAIL,
      to: params.to,
      replyTo: params.replyTo,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    if (error) {
      console.error(`[Email] Send failed to ${params.to}:`, error);
      return false;
    }

    console.log(`[Email] Sent to ${params.to}: ${params.subject}`);
    return true;
  } catch (err) {
    console.error(`[Email] Error sending to ${params.to}:`, err);
    return false;
  }
}
