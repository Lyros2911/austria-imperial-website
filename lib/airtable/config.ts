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
  PARTNER_REVENUE: 'Partner Revenue',
} as const;

/** Map DB producer enum → Airtable table name (static fallback for performance) */
export const PRODUCER_TABLE_MAP: Record<string, string> = {
  kiendler: TABLES.SHOP_KUERBISKERNOEL,
  hernach: TABLES.SHOP_KREN,
};

/**
 * Dynamic lookup for producer Airtable table name.
 * Checks static map first, then falls back to DB lookup.
 */
export async function getProducerTableName(slug: string): Promise<string | null> {
  const staticName = PRODUCER_TABLE_MAP[slug];
  if (staticName) return staticName;

  // Dynamic lookup from DB
  const { db } = await import('@/lib/db/drizzle');
  const { producers } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  const producer = await db.query.producers.findFirst({
    where: eq(producers.slug, slug),
    columns: { airtableTableName: true },
  });
  return producer?.airtableTableName ?? null;
}
