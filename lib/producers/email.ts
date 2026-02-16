/**
 * Producer Email — Structured Fallback Order Notification
 *
 * Sendet eine formatierte Bestellmail an den Produzenten.
 * Kein Rich-HTML — reiner Text, strukturiert, druckbar.
 *
 * Verwendet Nodemailer falls konfiguriert, sonst console.log als Dry-Run.
 *
 * ENV:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import type { ProducerOrderPayload, ProducerName, ProducerEmailData } from './types';

/**
 * Build the order email body (plain text).
 */
export function buildOrderEmailBody(payload: ProducerOrderPayload, producerName: ProducerName): string {
  const lines: string[] = [
    `═══════════════════════════════════════════════`,
    `  NEUE BESTELLUNG — AUSTRIA IMPERIAL GREEN GOLD`,
    `═══════════════════════════════════════════════`,
    ``,
    `Bestellnummer:    ${payload.orderNumber}`,
    `Fulfillment-ID:   ${payload.fulfillmentOrderId}`,
    `Produzent:        ${producerName.toUpperCase()}`,
    `Datum:            ${new Date().toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    ``,
    `── ARTIKEL ──────────────────────────────────`,
    ``,
  ];

  for (const item of payload.items) {
    lines.push(
      `  ${item.quantity}x  ${item.productName}`,
      `       Variante: ${item.variantName} (SKU: ${item.sku})`,
      `       ${item.sizeMl ? `Größe: ${item.sizeMl}ml` : ''}${item.weightGrams ? ` · Gewicht: ${item.weightGrams}g` : ''}`,
      ``
    );
  }

  lines.push(
    `── LIEFERADRESSE ────────────────────────────`,
    ``,
    `  ${payload.shipping.name}`,
    `  ${payload.shipping.street}`,
    ...(payload.shipping.street2 ? [`  ${payload.shipping.street2}`] : []),
    `  ${payload.shipping.postalCode} ${payload.shipping.city}`,
    ...(payload.shipping.state ? [`  ${payload.shipping.state}`] : []),
    `  ${payload.shipping.country}`,
    ``
  );

  if (payload.customerEmail) {
    lines.push(
      `── KUNDENKONTAKT ────────────────────────────`,
      `  E-Mail: ${payload.customerEmail}`,
      ``
    );
  }

  if (payload.notes) {
    lines.push(
      `── ANMERKUNGEN ──────────────────────────────`,
      `  ${payload.notes}`,
      ``
    );
  }

  lines.push(
    `═══════════════════════════════════════════════`,
    `Bitte Trackingnummer nach Versand an uns übermitteln.`,
    `Diese Bestellung wurde automatisch generiert.`,
    `═══════════════════════════════════════════════`,
  );

  return lines.join('\n');
}

/**
 * Build the full email data object.
 */
export function buildOrderEmail(
  payload: ProducerOrderPayload,
  producerName: ProducerName,
  toEmail: string
): ProducerEmailData {
  const subject = `[AIGG] Neue Bestellung ${payload.orderNumber} — ${payload.items.length} Artikel`;

  return {
    to: toEmail,
    subject,
    body: buildOrderEmailBody(payload, producerName),
    producerName,
    fulfillmentOrderId: payload.fulfillmentOrderId,
  };
}

/**
 * Actually send the email via SMTP (or dry-run to console).
 */
export async function sendProducerEmail(emailData: ProducerEmailData): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  // Check if SMTP is configured
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // DRY RUN — log to console for development
    console.log(`\n[Producer Email — DRY RUN] ══════════════════`);
    console.log(`  To:      ${emailData.to}`);
    console.log(`  Subject: ${emailData.subject}`);
    console.log(`  ──────────────────────────────────────────`);
    console.log(emailData.body);
    console.log(`[/Producer Email — DRY RUN] ═════════════════\n`);
    return true; // Treat dry-run as success
  }

  // Real SMTP send
  try {
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: (SMTP_PORT || '587') === '465',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.body,
    });

    console.log(`[Producer Email] Sent to ${emailData.to}: ${emailData.subject}`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown SMTP error';
    console.error(`[Producer Email] Failed to send to ${emailData.to}: ${message}`);
    return false;
  }
}
