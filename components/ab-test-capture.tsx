'use client';

import { useEffect } from 'react';
import {
  AB_COOKIE,
  AB_COOKIE_MAX_AGE,
  ACTIVE_EXPERIMENT,
  assignVariant,
  parseABCookie,
} from '@/lib/ab-testing';

/**
 * Client Component: Weist Besucher einer A/B-Variante zu.
 *
 * Wird einmal pro Seitenaufruf ausgefuehrt. Setzt Cookie nur wenn
 * noch keine Zuweisung existiert (erster Besuch gewinnt).
 *
 * Rendert nichts (unsichtbar). Folgt dem Pattern von AttributionCapture.
 */
export function ABTestCapture() {
  useEffect(() => {
    // Pruefen ob Cookie bereits existiert
    const existingCookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${AB_COOKIE}=`));

    if (existingCookie) {
      const value = decodeURIComponent(existingCookie.split('=')[1]);
      const assignment = parseABCookie(value);
      if (assignment) return; // Bereits zugewiesen
    }

    // Neue Zuweisung: UUID generieren + Variante bestimmen
    const visitorId = crypto.randomUUID();
    const variant = assignVariant(visitorId);

    const assignment = {
      experimentSlug: ACTIVE_EXPERIMENT,
      variant,
      visitorId,
      assignedAt: new Date().toISOString(),
    };

    document.cookie = `${AB_COOKIE}=${encodeURIComponent(
      JSON.stringify(assignment)
    )}; path=/; max-age=${AB_COOKIE_MAX_AGE}; SameSite=Lax`;
  }, []);

  return null;
}
