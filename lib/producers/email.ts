/**
 * Producer Email — Structured Order Notification
 *
 * Sendet eine formatierte Bestellmail an den Produzenten.
 * Kein Rich-HTML — reiner Text, strukturiert, druckbar.
 *
 * Verwendet Resend als E-Mail-Provider.
 * Fallback: console.log als Dry-Run wenn RESEND_API_KEY nicht gesetzt.
 *
 * ENV: RESEND_API_KEY
 */

import type { ProducerOrderPayload, ProducerEmailData } from './types';
import { sendEmail, AIGG_FROM_EMAIL } from '@/lib/email/resend';

/**
 * Build the order email body (plain text).
 */
export function buildOrderEmailBody(payload: ProducerOrderPayload, producerName: string): string {
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
  producerName: string,
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
 * Send the producer email via Resend.
 *
 * Falls back to console.log dry-run if RESEND_API_KEY is not set.
 */
export async function sendProducerEmail(emailData: ProducerEmailData): Promise<boolean> {
  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    // DRY RUN — log to console for development
    console.log(`\n[Producer Email — DRY RUN] ══════════════════`);
    console.log(`  To:      ${emailData.to}`);
    console.log(`  Subject: ${emailData.subject}`);
    console.log(`  ──────────────────────────────────────────`);
    console.log(emailData.body);
    console.log(`[/Producer Email — DRY RUN] ═════════════════\n`);
    return true; // Treat dry-run as success
  }

  // Real send via Resend
  return sendEmail({
    from: AIGG_FROM_EMAIL,
    to: emailData.to,
    subject: emailData.subject,
    text: emailData.body,
  });
}
