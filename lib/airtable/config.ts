/**
 * Airtable Configuration — Austria Imperial Green Gold
 *
 * Connects to the "Kernöl CRM" Airtable base for live order tracking.
 * Uses 4 "Shop" tables, separate from the B2B CRM tables.
 */

export const AIRTABLE_API = 'https://api.airtable.com/v0';

export function getAirtablePat(): string | undefined {
  return process.env.AIRTABLE_PAT;
}

export function getAirtableBaseId(): string {
  return process.env.AIRTABLE_BASE_ID || 'app7KX8W2LQGs8gWx';
}

export function isAirtableEnabled(): boolean {
  return !!process.env.AIRTABLE_PAT;
}

/** Table names in Airtable — must match exactly */
export const TABLES = {
  SHOP_BESTELLUNGEN: 'Austria Imperial Bestellungen',
  SHOP_KUERBISKERNOEL: 'Shop Kürbiskernöl',
  SHOP_KREN: 'Shop Kren',
  SHOP_KOMMUNIKATION: 'Shop Kommunikation',
} as const;

/** Map DB producer enum → Airtable table name */
export const PRODUCER_TABLE_MAP: Record<string, string> = {
  kiendler: TABLES.SHOP_KUERBISKERNOEL,
  hernach: TABLES.SHOP_KREN,
};
