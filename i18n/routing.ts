import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'en', 'ar', 'fr', 'it', 'es'],
  defaultLocale: 'de',
});
