/**
 * Order utility functions
 */

/**
 * Generate a unique order number: AIGG-YYYYMMDD-XXXX
 * e.g. AIGG-20260216-A3F7
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AIGG-${date}-${random}`;
}

/**
 * Producer cost lookup (Stückpreis in Cents).
 *
 * Diese Werte kommen von den Produzenten und werden
 * aktualisiert wenn sich die Konditionen ändern.
 *
 * TODO: In Phase 6 aus Konfigurationstabelle laden.
 */
export const PRODUCER_COSTS: Record<string, number> = {
  // Kiendler — Kernöl (Premium Design Flaschen)
  'KOL-250': 540,  // €5.40 — Kiendler Premium Design Flasche 250ml
  'KOL-500': 930,  // €9.30 — Kiendler Premium Design Flasche 500ml
  // Hernach — Kren
  'KRN-100': 190,  // €1.90 — Hernach Stückpreis 100g
  'KRN-200': 290,  // €2.90 — Hernach Stückpreis 200g
  'KRN-500': 590,  // €5.90 — Hernach Stückpreis 500g
};

/**
 * Get producer cost for a SKU. Returns cents.
 * Throws if SKU not found (data integrity check).
 */
export function getProducerCost(sku: string): number {
  const cost = PRODUCER_COSTS[sku];
  if (cost === undefined) {
    throw new Error(`Unknown SKU "${sku}" — no producer cost defined`);
  }
  return cost;
}
