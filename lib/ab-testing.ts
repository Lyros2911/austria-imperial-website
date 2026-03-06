/**
 * A/B Testing — Austria Imperial Green Gold
 *
 * Cookie-basierte Varianten-Zuweisung fuer die Avatar-Studie.
 * Anonyme Visitor-ID (UUID), keine PII.
 *
 * Flow:
 * 1. Besucher kommt auf die Seite
 * 2. ABTestCapture Component prueft Cookie, weist Variante zu (A/B)
 * 3. Events werden via POST /api/ab/track gesendet
 * 4. Checkout API liest Cookie, packt Variante in Stripe metadata
 * 5. Webhook schreibt Variante in orders-Tabelle
 *
 * Folgt dem Pattern von lib/attribution.ts
 */

export interface ABAssignment {
  experimentSlug: string;
  variant: 'A' | 'B';
  visitorId: string;
  assignedAt: string; // ISO timestamp
}

/** Cookie-Name (folgt aigg_* Konvention) */
export const AB_COOKIE = 'aigg_ab_variant';

/** 90 Tage in Sekunden — laenger als Attribution (30d), weil Studie langfristig laeuft */
export const AB_COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

/** Aktives Experiment — hardcoded fuer jetzt, koennte spaeter dynamisch werden */
export const ACTIVE_EXPERIMENT = 'avatar-v1';

/**
 * Deterministische Varianten-Zuweisung basierend auf Visitor-ID.
 *
 * Verwendet einen einfachen Hash damit der gleiche Besucher
 * immer die gleiche Variante bekommt, selbst wenn der Cookie
 * verloren geht und mit derselben ID neu erstellt wird.
 *
 * @param visitorId UUID des Besuchers
 * @param trafficPercent Prozent der Besucher die Variante A bekommen (default 50)
 * @returns 'A' oder 'B'
 */
export function assignVariant(
  visitorId: string,
  trafficPercent: number = 50
): 'A' | 'B' {
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = ((hash << 5) - hash + visitorId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100 < trafficPercent ? 'A' : 'B';
}

/**
 * Parse AB-Assignment aus Cookie-Wert (JSON-String).
 * Gibt null zurueck bei ungueltigem/fehlendem Cookie.
 */
export function parseABCookie(
  cookieValue: string | undefined
): ABAssignment | null {
  if (!cookieValue) return null;
  try {
    const data = JSON.parse(cookieValue);
    if (
      data &&
      typeof data.experimentSlug === 'string' &&
      (data.variant === 'A' || data.variant === 'B') &&
      typeof data.visitorId === 'string'
    ) {
      return data as ABAssignment;
    }
    return null;
  } catch {
    return null;
  }
}
