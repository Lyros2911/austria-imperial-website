/**
 * A/B Test Event Tracking — Client-Side
 *
 * Fire-and-forget Event-Tracking fuer die Avatar-Studie.
 * Liest den AB-Cookie und sendet Events an /api/ab/track.
 *
 * WICHTIG: Diese Funktion wirft NIEMALS Fehler.
 * Tracking darf das Benutzer-Erlebnis nicht beeintraechtigen.
 */

import { AB_COOKIE, parseABCookie } from '@/lib/ab-testing';

export type ABEventType =
  | 'page_view'
  | 'avatar_impression'
  | 'avatar_click'
  | 'add_to_cart'
  | 'checkout_start'
  | 'purchase';

/**
 * Sendet ein A/B-Test-Event. Non-blocking, fire-and-forget.
 *
 * Liest den AB-Cookie, sendet an /api/ab/track.
 * Gibt still zurueck wenn kein AB-Assignment existiert.
 *
 * @param eventType Art des Events
 * @param extra Optionale Zusatzdaten (productSlug, locale, metadata)
 */
export function trackABEvent(
  eventType: ABEventType,
  extra?: {
    productSlug?: string;
    locale?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  try {
    const cookieMatch = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${AB_COOKIE}=`));

    if (!cookieMatch) return;

    const assignment = parseABCookie(
      decodeURIComponent(cookieMatch.split('=')[1])
    );
    if (!assignment) return;

    // Fire and forget — kein await, kein .then()
    fetch('/api/ab/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experimentSlug: assignment.experimentSlug,
        visitorId: assignment.visitorId,
        variant: assignment.variant,
        eventType,
        productSlug: extra?.productSlug,
        locale: extra?.locale,
        metadata: extra?.metadata,
      }),
      // keepalive stellt sicher dass der Request auch bei Seitennavigation ankommt
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking darf NIEMALS das Benutzer-Erlebnis stoeren
  }
}
