/**
 * Contact Form API — Austria Imperial Green Gold
 *
 * POST /api/contact
 *
 * 1. Validiert die Eingaben
 * 2. Sendet Notification an info@austriaimperial.com
 * 3. Sendet Bestätigung an den Absender
 *
 * E-Mail-Versand ist non-blocking — wenn eine fehlschlägt,
 * bekommt der Nutzer trotzdem eine Erfolgsmeldung.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendContactNotification, sendContactConfirmation } from '@/lib/email/contact';
import { createRecord } from '@/lib/airtable/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, E-Mail und Nachricht sind erforderlich.' },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' },
        { status: 400 }
      );
    }

    const formData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject || 'general',
      message: message.trim(),
    };

    // Detect locale from referer (e.g. /en/contact, /ar/contact)
    const referer = request.headers.get('referer') || '';
    const localeMatch = referer.match(/\/(de|en|ar|fr|it|es)(\/|$)/);
    const locale = localeMatch?.[1] || 'de';

    // Send emails + sync to Airtable CRM in parallel (non-blocking)
    const [notifResult, confirmResult] = await Promise.allSettled([
      sendContactNotification(formData),
      sendContactConfirmation(formData, locale),
      // Sync lead to Airtable CRM (Kernoel CRM base)
      createRecord('Kontakte', {
        Name: formData.name,
        Email: formData.email,
        Betreff: formData.subject,
        Nachricht: formData.message,
        Quelle: 'website-kontakt',
        Sprache: locale,
        Datum: new Date().toISOString().split('T')[0],
      }).catch((err: unknown) => {
        console.warn('[Contact] Airtable CRM sync failed:', err);
      }),
    ]);

    // Log results for monitoring
    console.log(`[Contact] ${formData.email}: notification=${
      notifResult.status === 'fulfilled' ? notifResult.value : 'error'
    }, confirmation=${
      confirmResult.status === 'fulfilled' ? confirmResult.value : 'error'
    }`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Contact] API error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    );
  }
}
