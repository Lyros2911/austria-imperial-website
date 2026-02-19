/**
 * Order Confirmation Email — Austria Imperial Green Gold
 *
 * Wird gesendet nachdem eine Bestellung erfolgreich bezahlt wurde.
 * Enthält: Bestellnummer, Artikel, Lieferadresse, nächste Schritte.
 *
 * Aufgerufen im Stripe Webhook nach createOrder().
 */

import { sendEmail, AIGG_FROM_EMAIL, AIGG_NOTIFICATION_EMAIL } from './resend';

export interface OrderConfirmationData {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: Array<{
    productName: string;
    variantName: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shipping: {
    name: string;
    street: string;
    street2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

/**
 * Send order confirmation to the customer.
 */
export async function sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
  return sendEmail({
    to: data.customerEmail,
    subject: `Bestellbestätigung ${data.orderNumber} — Austria Imperial`,
    text: buildOrderConfirmationText(data),
  });
}

/**
 * Send order notification to the shop owner (info@austriaimperial.com).
 */
export async function sendOrderNotification(data: OrderConfirmationData): Promise<boolean> {
  return sendEmail({
    to: AIGG_NOTIFICATION_EMAIL,
    subject: `[AIGG] Neue Bestellung ${data.orderNumber} — ${formatCents(data.totalCents)}`,
    text: buildOrderNotificationText(data),
  });
}

// ─── Templates ───────────────────────────────

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function buildOrderConfirmationText(data: OrderConfirmationData): string {
  const lines: string[] = [
    `Guten Tag ${data.customerName},`,
    ``,
    `vielen Dank fuer Ihre Bestellung bei Austria Imperial - Green Gold!`,
    ``,
    `========================================`,
    `  BESTELLBESTAETIGUNG`,
    `  Bestellnummer: ${data.orderNumber}`,
    `========================================`,
    ``,
    `-- IHRE ARTIKEL -----------------------`,
    ``,
  ];

  for (const item of data.items) {
    lines.push(
      `  ${item.quantity}x ${item.productName} - ${item.variantName}`,
      `     ${formatCents(item.unitPriceCents * item.quantity)}`,
      ``,
    );
  }

  lines.push(
    `--------------------------------------`,
    `  Zwischensumme:  ${formatCents(data.subtotalCents)}`,
    `  Versand:        ${data.shippingCents > 0 ? formatCents(data.shippingCents) : 'Kostenlos'}`,
    `  ----------------`,
    `  Gesamt:         ${formatCents(data.totalCents)}`,
    ``,
    `-- LIEFERADRESSE ----------------------`,
    ``,
    `  ${data.shipping.name}`,
    `  ${data.shipping.street}`,
  );

  if (data.shipping.street2) {
    lines.push(`  ${data.shipping.street2}`);
  }

  lines.push(
    `  ${data.shipping.postalCode} ${data.shipping.city}`,
    `  ${data.shipping.country}`,
    ``,
    `-- WAS PASSIERT ALS NAECHSTES? --------`,
    ``,
    `  1. Ihre Bestellung wird an unsere Erzeuger weitergeleitet.`,
    `  2. Sie erhalten eine Versandbenachrichtigung mit Tracking-Nummer.`,
    `  3. Lieferung innerhalb von 3-5 Werktagen.`,
    ``,
    `Bei Fragen erreichen Sie uns jederzeit unter:`,
    `info@austriaimperial.com`,
    ``,
    `Mit freundlichen Gruessen,`,
    `Ihr Austria Imperial Team`,
    ``,
    `---`,
    `Austria Imperial - Green Gold`,
    `Premium Steirisches Kuerbiskernoel & Kren`,
    `https://austriaimperial.com`,
  );

  return lines.join('\n');
}

function buildOrderNotificationText(data: OrderConfirmationData): string {
  const lines: string[] = [
    `════════════════════════════════════════`,
    `  NEUE BESTELLUNG EINGEGANGEN`,
    `════════════════════════════════════════`,
    ``,
    `Bestellnummer: ${data.orderNumber}`,
    `Kunde:         ${data.customerName}`,
    `E-Mail:        ${data.customerEmail}`,
    `Gesamt:        ${formatCents(data.totalCents)}`,
    ``,
    `── ARTIKEL ────────────────────────────`,
    ``,
  ];

  for (const item of data.items) {
    lines.push(`  ${item.quantity}x ${item.productName} — ${item.variantName}`);
  }

  lines.push(
    ``,
    `── LIEFERADRESSE ──────────────────────`,
    `  ${data.shipping.name}`,
    `  ${data.shipping.street}`,
    `  ${data.shipping.postalCode} ${data.shipping.city}`,
    `  ${data.shipping.country}`,
    ``,
    `════════════════════════════════════════`,
  );

  return lines.join('\n');
}
