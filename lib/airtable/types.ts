/**
 * Airtable Type Definitions — Austria Imperial Green Gold
 *
 * Field interfaces for all 4 Shop tables + status label mappings.
 */

// ============================================================
// TABLE FIELD INTERFACES
// ============================================================

export interface ShopBestellungenFields {
  Bestellnummer: string;
  Kunde: string;
  'E-Mail': string;
  Status: string;
  Gesamtbetrag: number; // EUR (not cents)
  Versandkosten: number; // EUR (not cents)
  Lieferadresse: string;
  Bestelldatum: string; // ISO 8601
  'Shop Kürbiskernöl'?: string[]; // Linked record IDs
  'Shop Kren'?: string[]; // Linked record IDs
  'Shop Kommunikation'?: string[]; // Linked record IDs
  'DB Order ID': number;
  // Attribution tracking
  Quelle?: string; // "instagram", "youtube", "direct"
  'UTM Source'?: string;
  'UTM Campaign'?: string;
}

export interface ShopProductFields {
  Auftrag: string; // Primary: e.g. "AIGG-20260225-9HDG-Kiendler"
  'Shop Bestellungen': string[]; // Linked → Shop Bestellungen (auto-generated reverse link)
  Produkte: string; // Human-readable item list
  'Menge gesamt': number;
  Betrag: number; // EUR (not cents)
  Produzent: string;
  Status: string;
  Trackingnummer?: string;
  'Tracking-Link'?: string;
  Versandmethode?: string;
  'Bestellung gesendet am'?: string; // ISO 8601
  'Bestätigt am'?: string;
  'Versendet am'?: string;
  'Zugestellt am'?: string;
  Fehler?: string;
  'DB Fulfillment ID': number;
}

export interface ShopKommunikationFields {
  Betreff: string; // Primary
  'Shop Bestellungen': string[]; // Linked → Shop Bestellungen (auto-generated reverse link)
  Typ: string;
  Empfänger: string;
  Status: string;
  Zeitpunkt: string; // ISO 8601
  Details?: string;
}

// ============================================================
// STATUS LABEL MAPPINGS (DB enum → German Airtable label)
// ============================================================

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  paid: 'Bezahlt',
  processing: 'In Bearbeitung',
  partially_shipped: 'Teilweise versendet',
  shipped: 'Versendet',
  delivered: 'Zugestellt',
  cancelled: 'Storniert',
  refunded: 'Erstattet',
};

export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  sent_to_producer: 'An Produzent gesendet',
  confirmed: 'Bestätigt',
  shipped: 'Versendet',
  delivered: 'Zugestellt',
  failed: 'Fehlgeschlagen',
  cancelled: 'Storniert',
};

export const PRODUCER_LABELS: Record<string, string> = {
  kiendler: 'Kiendler',
  hernach: 'Hernach',
};

export const COMM_TYPE = {
  CUSTOMER_CONFIRMATION: 'Kundenbestätigung',
  OFFICE_NOTIFICATION: 'Office-Benachrichtigung',
  PRODUCER_ORDER: 'Produzenten-Bestellung',
  STATUS_CHANGE: 'Statusänderung',
} as const;

export const COMM_STATUS = {
  SENT: 'Gesendet',
  FAILED: 'Fehlgeschlagen',
} as const;
