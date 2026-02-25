'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, parseUtmParams } from '@/lib/attribution';

/**
 * Client Component: Erfasst UTM-Parameter aus der URL und speichert sie als Cookie.
 *
 * Wird einmal pro Seitenaufruf ausgeführt. Überschreibt bestehende Attribution
 * nur wenn neue UTM-Parameter in der URL vorhanden sind (letzter Klick gewinnt).
 *
 * Rendert nichts (unsichtbar).
 */
export function AttributionCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const attribution = parseUtmParams(searchParams);
    if (attribution) {
      // Referrer hinzufügen
      if (document.referrer && !document.referrer.includes(window.location.hostname)) {
        attribution.referrer = document.referrer;
      }

      // Cookie setzen (30 Tage, SameSite=Lax für externe Links)
      document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(attribution))}; path=/; max-age=${ATTRIBUTION_MAX_AGE}; SameSite=Lax`;
    }
  }, [searchParams]);

  return null;
}
