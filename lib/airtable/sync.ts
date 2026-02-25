/**
 * Airtable Sync — Austria Imperial Green Gold
 *
 * High-level functions to sync order lifecycle data to Airtable.
 * Every function is fire-and-forget: logs errors, NEVER throws.
 * PostgreSQL remains the source of truth.
 */

import { isAirtableEnabled, TABLES, PRODUCER_TABLE_MAP } from './config';
import { upsertByFormula, findRecord, createRecord, updateRecord } from './client';
import {
  type ShopBestellungenFields,
  type ShopProductFields,
  type ShopKommunikationFields,
  ORDER_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
  PRODUCER_LABELS,
  COMM_STATUS,
} from './types';

// ============================================================
// HELPERS
// ============================================================

function centsToEur(cents: number): number {
  return Math.round(cents) / 100;
}

function formatAddress(addr: {
  name?: string;
  street?: string;
  street2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}): string {
  const lines = [
    addr.name,
    addr.street,
    addr.street2,
    [addr.postalCode, addr.city].filter(Boolean).join(' '),
    addr.country,
  ].filter(Boolean);
  return lines.join('\n');
}

// ============================================================
// 1. SYNC ORDER
// ============================================================

export interface SyncOrderInput {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productName: string;
    variantName: string;
    quantity: number;
  }>;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shipping: {
    name?: string;
    street?: string;
    street2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  status: string;
}

/**
 * Sync a new order to Airtable "Shop Bestellungen".
 * Idempotent: upserts by Bestellnummer.
 * Returns the Airtable record ID for linking, or null on failure.
 */
export async function syncOrderToAirtable(
  input: SyncOrderInput,
): Promise<string | null> {
  if (!isAirtableEnabled()) return null;

  try {
    const artikelText = input.items
      .map((i) => `${i.quantity}x ${i.productName} ${i.variantName}`)
      .join('\n');

    const fields: Partial<ShopBestellungenFields> = {
      Bestellnummer: input.orderNumber,
      Kunde: input.customerName,
      'E-Mail': input.customerEmail,
      Status: ORDER_STATUS_LABELS[input.status] || input.status,
      Gesamtbetrag: centsToEur(input.totalCents),
      Versandkosten: centsToEur(input.shippingCents),
      Lieferadresse: formatAddress(input.shipping),
      Bestelldatum: new Date().toISOString(),
      'DB Order ID': input.orderId,
    };

    const result = await upsertByFormula<ShopBestellungenFields>(
      TABLES.SHOP_BESTELLUNGEN,
      `{Bestellnummer} = "${input.orderNumber}"`,
      fields,
    );

    if (result.success && result.data) {
      console.log(
        `[Airtable] Order synced: ${input.orderNumber} → ${result.data.id}`,
      );
      return result.data.id;
    }

    console.error(`[Airtable] Order sync failed: ${result.error}`);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Airtable] syncOrderToAirtable failed: ${msg}`);
    return null;
  }
}

// ============================================================
// 2. SYNC FULFILLMENT (Product-specific table)
// ============================================================

export interface SyncFulfillmentInput {
  fulfillmentOrderId: number;
  orderNumber: string;
  orderAirtableId: string | null;
  producer: string; // 'kiendler' | 'hernach'
  items: Array<{
    productName: string;
    variantName: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  status: string;
}

/**
 * Sync a fulfillment order to the correct product table
 * (Shop Kürbiskernöl or Shop Kren).
 * Returns the Airtable record ID or null.
 */
export async function syncFulfillmentToAirtable(
  input: SyncFulfillmentInput,
): Promise<string | null> {
  if (!isAirtableEnabled()) return null;

  try {
    const table = PRODUCER_TABLE_MAP[input.producer];
    if (!table) {
      console.error(`[Airtable] Unknown producer: ${input.producer}`);
      return null;
    }

    const producerLabel =
      PRODUCER_LABELS[input.producer] || input.producer;
    const auftragId = `${input.orderNumber}-${producerLabel}`;

    const produkteText = input.items
      .map((i) => `${i.quantity}x ${i.productName} ${i.variantName}`)
      .join('\n');

    const totalQuantity = input.items.reduce((sum, i) => sum + i.quantity, 0);
    const totalCents = input.items.reduce(
      (sum, i) => sum + i.quantity * i.unitPriceCents,
      0,
    );

    const fields: Partial<ShopProductFields> = {
      Auftrag: auftragId,
      Produkte: produkteText,
      'Menge gesamt': totalQuantity,
      Betrag: centsToEur(totalCents),
      Produzent: producerLabel,
      Status:
        FULFILLMENT_STATUS_LABELS[input.status] || input.status,
      'DB Fulfillment ID': input.fulfillmentOrderId,
    };

    // Link to parent order if we have the Airtable ID
    if (input.orderAirtableId) {
      fields['Shop Bestellungen'] = [input.orderAirtableId];
    }

    const result = await upsertByFormula<ShopProductFields>(
      table,
      `{Auftrag} = "${auftragId}"`,
      fields,
    );

    if (result.success && result.data) {
      console.log(
        `[Airtable] Fulfillment synced: ${auftragId} → ${table} (${result.data.id})`,
      );
      return result.data.id;
    }

    console.error(`[Airtable] Fulfillment sync failed: ${result.error}`);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Airtable] syncFulfillmentToAirtable failed: ${msg}`);
    return null;
  }
}

// ============================================================
// 3. UPDATE FULFILLMENT STATUS
// ============================================================

export interface UpdateFulfillmentInput {
  fulfillmentOrderId: number;
  producer: string;
  orderNumber: string;
  status: string;
  method?: string;
  externalOrderId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  error?: string;
  retryCount?: number;
}

/**
 * Update fulfillment status in the correct product table.
 * Finds by DB Fulfillment ID.
 */
export async function updateFulfillmentInAirtable(
  input: UpdateFulfillmentInput,
): Promise<void> {
  if (!isAirtableEnabled()) return;

  try {
    const table = PRODUCER_TABLE_MAP[input.producer];
    if (!table) return;

    const producerLabel =
      PRODUCER_LABELS[input.producer] || input.producer;
    const auftragId = `${input.orderNumber}-${producerLabel}`;

    // Find existing record
    const existing = await findRecord<ShopProductFields>(
      table,
      `{Auftrag} = "${auftragId}"`,
    );

    if (!existing.success || !existing.data) {
      console.warn(
        `[Airtable] Fulfillment record not found for update: ${auftragId}`,
      );
      return;
    }

    const fields: Partial<ShopProductFields> = {
      Status:
        FULFILLMENT_STATUS_LABELS[input.status] || input.status,
    };

    if (input.method) fields.Versandmethode = input.method === 'api' ? 'API' : 'E-Mail';
    if (input.trackingNumber) fields.Trackingnummer = input.trackingNumber;
    if (input.trackingUrl) fields['Tracking-Link'] = input.trackingUrl;
    if (input.error) fields.Fehler = input.error;
    if (input.retryCount !== undefined) fields['DB Fulfillment ID'] = input.fulfillmentOrderId;

    // Set timestamp fields based on status
    const now = new Date().toISOString();
    if (input.status === 'sent_to_producer') fields['Bestellung gesendet am'] = now;
    if (input.status === 'confirmed') fields['Bestätigt am'] = now;
    if (input.status === 'shipped') fields['Versendet am'] = now;
    if (input.status === 'delivered') fields['Zugestellt am'] = now;

    await updateRecord<ShopProductFields>(table, existing.data.id, fields);
    console.log(`[Airtable] Fulfillment updated: ${auftragId} → ${input.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Airtable] updateFulfillmentInAirtable failed: ${msg}`);
  }
}

// ============================================================
// 4. LOG COMMUNICATION
// ============================================================

export interface LogCommunicationInput {
  orderNumber: string;
  orderAirtableId: string | null;
  type: string;
  recipient: string;
  subject: string;
  success: boolean;
  details?: string;
}

/**
 * Log a communication event (email sent/failed) in "Shop Kommunikation".
 * Always creates a new record (append-only log).
 */
export async function logCommunicationToAirtable(
  input: LogCommunicationInput,
): Promise<void> {
  if (!isAirtableEnabled()) return;

  try {
    const fields: Partial<ShopKommunikationFields> = {
      Betreff: input.subject,
      Typ: input.type,
      Empfänger: input.recipient,
      Status: input.success ? COMM_STATUS.SENT : COMM_STATUS.FAILED,
      Zeitpunkt: new Date().toISOString(),
    };

    if (input.details) fields.Details = input.details;

    // Link to parent order if we have the Airtable ID
    if (input.orderAirtableId) {
      fields['Shop Bestellungen'] = [input.orderAirtableId];
    }

    const result = await createRecord<ShopKommunikationFields>(
      TABLES.SHOP_KOMMUNIKATION,
      fields,
    );

    if (result.success) {
      console.log(
        `[Airtable] Communication logged: ${input.type} → ${input.recipient} (${input.success ? 'OK' : 'FAILED'})`,
      );
    } else {
      console.error(
        `[Airtable] Communication log failed: ${input.type} → ${input.recipient}: ${result.error}`,
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Airtable] logCommunicationToAirtable failed: ${msg}`);
  }
}

// ============================================================
// 5. UPDATE ORDER STATUS
// ============================================================

/**
 * Update the aggregate order status in "Shop Bestellungen".
 */
export async function updateOrderStatusInAirtable(
  orderNumber: string,
  status: string,
): Promise<void> {
  if (!isAirtableEnabled()) return;

  try {
    const existing = await findRecord<ShopBestellungenFields>(
      TABLES.SHOP_BESTELLUNGEN,
      `{Bestellnummer} = "${orderNumber}"`,
    );

    if (!existing.success || !existing.data) {
      console.warn(
        `[Airtable] Order not found for status update: ${orderNumber}`,
      );
      return;
    }

    await updateRecord<ShopBestellungenFields>(
      TABLES.SHOP_BESTELLUNGEN,
      existing.data.id,
      { Status: ORDER_STATUS_LABELS[status] || status },
    );

    console.log(`[Airtable] Order status updated: ${orderNumber} → ${status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Airtable] updateOrderStatusInAirtable failed: ${msg}`);
  }
}
