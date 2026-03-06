'use client';

import { useEffect } from 'react';
import { trackABEvent } from '@/lib/ab-tracking';

/**
 * Duenne Client-Wrapper-Komponente fuer page_view-Tracking.
 *
 * Wird in Server-Komponenten (z.B. Produktseiten) eingebettet,
 * um client-seitig ein page_view-Event zu tracken.
 *
 * Rendert nichts (unsichtbar).
 */
export function ABPageView({
  productSlug,
  locale,
}: {
  productSlug: string;
  locale: string;
}) {
  useEffect(() => {
    trackABEvent('page_view', { productSlug, locale });
  }, [productSlug, locale]);

  return null;
}
