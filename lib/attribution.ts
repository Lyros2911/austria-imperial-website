/**
 * Attribution Tracking — Austria Imperial Green Gold
 *
 * Erfasst UTM-Parameter aus der URL und speichert sie in einem Cookie.
 * Der Checkout API liest den Cookie und gibt die Daten an Stripe weiter.
 *
 * Flow:
 * 1. Kunde klickt Content-Link: austriaimperial.com?utm_source=instagram&utm_campaign=auryx_engine
 * 2. AttributionCapture Component liest URL-Parameter, setzt Cookie (30 Tage)
 * 3. Checkout API liest Cookie, packt Daten in Stripe Session metadata
 * 4. Webhook extrahiert metadata, speichert in orders + Airtable
 */

export interface Attribution {
  source: string;          // utm_source oder 'direct'
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  referrer?: string;
  captured_at: string;     // ISO timestamp
}

export const ATTRIBUTION_COOKIE = 'aigg_attribution';
export const ATTRIBUTION_MAX_AGE = 30 * 24 * 60 * 60; // 30 Tage in Sekunden

/**
 * Parse UTM parameters from URL search params.
 * Returns null if no UTM params found.
 */
export function parseUtmParams(searchParams: URLSearchParams): Attribution | null {
  const utm_source = searchParams.get('utm_source');
  const utm_medium = searchParams.get('utm_medium');
  const utm_campaign = searchParams.get('utm_campaign');
  const utm_content = searchParams.get('utm_content');
  const ref = searchParams.get('ref'); // shorthand alias

  // Mindestens ein Parameter muss vorhanden sein
  if (!utm_source && !utm_campaign && !ref) {
    return null;
  }

  return {
    source: utm_source || ref || 'unknown',
    utm_source: utm_source || ref || undefined,
    utm_medium: utm_medium || undefined,
    utm_campaign: utm_campaign || undefined,
    utm_content: utm_content || undefined,
    captured_at: new Date().toISOString(),
  };
}

/**
 * Parse attribution from cookie value (JSON string).
 * Returns null on invalid/missing data.
 */
export function parseAttributionCookie(cookieValue: string | undefined): Attribution | null {
  if (!cookieValue) return null;
  try {
    const data = JSON.parse(cookieValue);
    if (data && typeof data.source === 'string') {
      return data as Attribution;
    }
    return null;
  } catch {
    return null;
  }
}
