/**
 * JSON-LD Structured Data for SEO
 *
 * Organization + WebSite schema for all pages.
 * Product schema is added per product detail page.
 */

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Austria Imperial Green Gold',
    alternateName: 'AIGG (gemeinnütziger Verein)',
    url: 'https://austriaimperial.com',
    logo: 'https://austriaimperial.com/images/logo.png',
    description:
      'Premium steirisches Kuerbiskernoel g.g.A., Kren und Krenpellets aus Oesterreich.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'AT',
      addressRegion: 'Steiermark',
    },
    sameAs: [
      'https://www.instagram.com/austriaimperial/',
      'https://www.youtube.com/@austriaimperial',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'office@austriaimperial.com',
      contactType: 'customer service',
      availableLanguage: ['German', 'English', 'Arabic'],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebSiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Austria Imperial Green Gold',
    url: 'https://austriaimperial.com',
    inLanguage: ['de', 'en', 'ar'],
    publisher: {
      '@type': 'Organization',
      name: 'AIGG (gemeinnütziger Verein)',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  image,
  sku,
  priceCents,
  currency = 'EUR',
  availability = 'InStock',
  url,
}: {
  name: string;
  description: string;
  image: string;
  sku: string;
  priceCents: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  url: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: `https://austriaimperial.com${image}`,
    sku,
    brand: {
      '@type': 'Brand',
      name: 'Austria Imperial Green Gold',
    },
    offers: {
      '@type': 'Offer',
      price: (priceCents / 100).toFixed(2),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url: `https://austriaimperial.com${url}`,
      seller: {
        '@type': 'Organization',
        name: 'AIGG (gemeinnütziger Verein)',
      },
    },
    countryOfOrigin: {
      '@type': 'Country',
      name: 'Austria',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
