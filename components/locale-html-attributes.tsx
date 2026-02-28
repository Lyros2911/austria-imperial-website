'use client';

import { useEffect } from 'react';

/**
 * Sets lang and dir attributes on <html> dynamically.
 * Needed because root layout.tsx doesn't have access to the locale param.
 */
export function LocaleHtmlAttributes({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}
