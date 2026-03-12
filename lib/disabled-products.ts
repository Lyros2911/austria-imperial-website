/**
 * Disabled Products — Feature Flag fuer Producer/Produkt-Deaktivierung
 *
 * Hernach (Kren) hat keine Ware. Alle Hernach-Produkte sind deaktiviert.
 * Reaktivierung: Eintraege entfernen + is_active=true in DB + Deploy.
 */
export const DISABLED_PRODUCERS = ['hernach'] as const;
export const DISABLED_CATEGORIES = ['kren'] as const;

export function isProducerDisabled(producer: string): boolean {
  return (DISABLED_PRODUCERS as readonly string[]).includes(producer);
}

export function isCategoryDisabled(category: string): boolean {
  return (DISABLED_CATEGORIES as readonly string[]).includes(category);
}
