import type { MetadataRoute } from 'next';

const BASE_URL = 'https://austriaimperial.com';
const LOCALES = ['de', 'en', 'ar'];
const LAST_MODIFIED = new Date();

// All public pages with their change frequencies and priorities
const PAGES: Array<{
  path: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}> = [
  { path: '', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/products', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/products/steirisches-kuerbiskernoel', changeFrequency: 'monthly', priority: 0.8 },
  // DEACTIVATED: Hernach/Kren out of stock — reactivate when stock available
  // { path: '/products/steirischer-kren', changeFrequency: 'monthly', priority: 0.8 },
  // { path: '/products/krenpellets-pferde', changeFrequency: 'monthly', priority: 0.7 },
  // { path: '/products/krenpellets-kamele', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/expedition', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/expedition/blog', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/sponsoring', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/legal/agb', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/datenschutz', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/impressum', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/widerruf', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of PAGES) {
    for (const locale of LOCALES) {
      const alternates: Record<string, string> = {};
      for (const alt of LOCALES) {
        alternates[alt] = `${BASE_URL}/${alt}${page.path}`;
      }

      entries.push({
        url: `${BASE_URL}/${locale}${page.path}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: page.changeFrequency,
        priority: locale === 'de' ? page.priority : page.priority * 0.9,
        alternates: { languages: alternates },
      });
    }
  }

  return entries;
}
