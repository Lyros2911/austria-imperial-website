/**
 * Seed Script - Austria Imperial Green Gold
 *
 * Creates initial products and variants in the database.
 * Optionally creates Stripe products/prices if STRIPE_SECRET_KEY is set.
 *
 * Produkte:
 *   Menschen: Kürbiskernöl g.g.A. (250ml, 500ml), Kren trocken (Preise folgen)
 *   Tiere:    Krenpellets Pferde (Preise folgen), Krenpellets Kamele (Preise folgen)
 *
 * Usage: npx tsx lib/db/seed.ts
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { products, productVariants } from './schema';

async function seed() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not set. Copy .env.example to .env and fill in values.');
  }

  const sql = neon(process.env.POSTGRES_URL);
  const db = drizzle(sql);

  console.log('Seeding Austria Imperial Green Gold database...\n');

  // ── 1. Products ──────────────────────────────────────────

  console.log('Creating products...');

  // Menschen: Kürbiskernöl
  const [kernoel] = await db
    .insert(products)
    .values({
      slug: 'steirisches-kuerbiskernoel',
      nameDe: 'Steirisches Kürbiskernöl g.g.A.',
      nameEn: 'Styrian Pumpkin Seed Oil PGI',
      descriptionDe:
        'Premium kaltgepresstes Kürbiskernöl aus 100% steirischen Kürbiskernen. ' +
        'Geschützte geographische Angabe (g.g.A.) — EU-zertifizierte Herkunft. ' +
        'Intensives, nussiges Aroma. Perfekt für Salate, Suppen und Desserts.',
      descriptionEn:
        'Premium cold-pressed pumpkin seed oil from 100% Styrian pumpkin seeds. ' +
        'Protected Geographical Indication (PGI) — EU-certified origin. ' +
        'Intense, nutty aroma. Perfect for salads, soups, and desserts.',
      category: 'kernoel',
      producer: 'kiendler',
    })
    .returning();

  // Menschen: Kren trocken (KEIN Glas!)
  const [kren] = await db
    .insert(products)
    .values({
      slug: 'steirischer-kren',
      nameDe: 'Steirischer Kren trocken — Scharfer Rudi',
      nameEn: 'Styrian Dried Horseradish — Scharfer Rudi',
      descriptionDe:
        'Getrockneter steirischer Kren (Meerrettich) in Premiumqualität. ' +
        'Natürlich scharf, ohne Konservierungsstoffe. ' +
        'Mascot: Scharfer Rudi — der steirische Krieger unter den Gewürzen. Lange haltbar, vielseitig einsetzbar.',
      descriptionEn:
        'Premium dried Styrian horseradish. Naturally spicy, no preservatives. ' +
        'Mascot: Scharfer Rudi — the Styrian warrior among spices. Long shelf life, versatile use.',
      category: 'kren',
      producer: 'hernach',
    })
    .returning();

  // Tiere: Krenpellets Pferde
  const [pferde] = await db
    .insert(products)
    .values({
      slug: 'krenpellets-pferde',
      nameDe: 'Krenpellets für Pferde — 1kg',
      nameEn: 'Horseradish Pellets for Horses — 1kg',
      descriptionDe:
        'Natürliche Kren-Nahrungsergänzung für Pferde. ' +
        'Unterstützt die Atemwege und das allgemeine Wohlbefinden. ' +
        'Aus steirischem Kren hergestellt, pelletiert für einfache Dosierung.',
      descriptionEn:
        'Natural horseradish feed supplement for horses. ' +
        'Supports respiratory health and overall well-being. ' +
        'Made from Styrian horseradish, pelletized for easy dosage.',
      category: 'tiernahrung',
      producer: 'hernach',
    })
    .returning();

  // Tiere: Krenpellets Kamele
  const [kamele] = await db
    .insert(products)
    .values({
      slug: 'krenpellets-kamele',
      nameDe: 'Krenpellets für Kamele — 1kg',
      nameEn: 'Horseradish Pellets for Camels — 1kg',
      descriptionDe:
        'Speziell für den arabischen Markt entwickelte Kren-Nahrungsergänzung für Kamele. ' +
        'Premium-Qualität aus steirischem Kren, pelletiert für einfache Verabreichung.',
      descriptionEn:
        'Specially developed horseradish feed supplement for camels, targeting the Arabian market. ' +
        'Premium quality from Styrian horseradish, pelletized for easy administration.',
      category: 'tiernahrung',
      producer: 'hernach',
    })
    .returning();

  console.log(`  Created: ${kernoel.nameDe} (id: ${kernoel.id})`);
  console.log(`  Created: ${kren.nameDe} (id: ${kren.id})`);
  console.log(`  Created: ${pferde.nameDe} (id: ${pferde.id})`);
  console.log(`  Created: ${kamele.nameDe} (id: ${kamele.id})`);

  // ── 2. Product Variants ──────────────────────────────────
  // Nur Kürbiskernöl hat aktuell Varianten mit Preisen.
  // Kren-Preise + Krenpellets-Preise kommen nächste Woche.

  console.log('\nCreating product variants...');

  const kernoelVariants = await db
    .insert(productVariants)
    .values([
      {
        productId: kernoel.id,
        sku: 'KOL-250',
        nameDe: '250ml Premium',
        nameEn: '250ml Premium',
        sizeMl: 250,
        priceCents: 1790, // EUR 17,90
        weightGrams: 340,
      },
      {
        productId: kernoel.id,
        sku: 'KOL-500',
        nameDe: '500ml Premium',
        nameEn: '500ml Premium',
        sizeMl: 500,
        priceCents: 2990, // EUR 29,90
        weightGrams: 620,
      },
    ])
    .returning();

  // HINWEIS: Kren trocken, Krenpellets Pferde und Kamele haben noch KEINE Varianten.
  // Werden angelegt sobald Preise verfügbar sind.

  for (const v of kernoelVariants) {
    console.log(`  Created: ${v.sku} — ${v.nameDe} (EUR ${(v.priceCents / 100).toFixed(2)})`);
  }
  console.log('  Info: Kren + Krenpellets Varianten werden bei Preisfreigabe nachgepflegt.');

  // ── 3. Stripe Products + Prices (optional) ──────────────

  if (process.env.STRIPE_SECRET_KEY) {
    console.log('\nCreating Stripe products and prices...');

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Stripe Products für alle Produkte (auch ohne Preise)
    const stripeKernoel = await stripe.products.create({
      name: 'Steirisches Kürbiskernöl g.g.A.',
      description: 'Premium cold-pressed Styrian pumpkin seed oil (PGI)',
      metadata: { aigg_product_id: String(kernoel.id) },
    });

    const stripeKren = await stripe.products.create({
      name: 'Steirischer Kren trocken — Scharfer Rudi',
      description: 'Premium dried Styrian horseradish',
      metadata: { aigg_product_id: String(kren.id) },
    });

    const stripePferde = await stripe.products.create({
      name: 'Krenpellets für Pferde — 1kg',
      description: 'Natural horseradish feed supplement for horses',
      metadata: { aigg_product_id: String(pferde.id) },
    });

    const stripeKamele = await stripe.products.create({
      name: 'Krenpellets für Kamele — 1kg',
      description: 'Horseradish feed supplement for camels',
      metadata: { aigg_product_id: String(kamele.id) },
    });

    console.log(`  Stripe Product: ${stripeKernoel.name} → ${stripeKernoel.id}`);
    console.log(`  Stripe Product: ${stripeKren.name} → ${stripeKren.id}`);
    console.log(`  Stripe Product: ${stripePferde.name} → ${stripePferde.id}`);
    console.log(`  Stripe Product: ${stripeKamele.name} → ${stripeKamele.id}`);

    // Stripe Prices nur für Kürbiskernöl (einzige Produkte mit Varianten/Preisen)
    for (const variant of kernoelVariants) {
      const price = await stripe.prices.create({
        product: stripeKernoel.id,
        unit_amount: variant.priceCents,
        currency: 'eur',
        metadata: {
          aigg_variant_id: String(variant.id),
          sku: variant.sku,
        },
      });

      // Update variant with Stripe price ID via raw SQL
      await sql`UPDATE product_variants SET stripe_price_id = ${price.id} WHERE id = ${variant.id}`;

      console.log(`  Stripe price: ${variant.sku} → ${price.id}`);
    }

    console.log('  Info: Stripe Prices für Kren + Krenpellets werden bei Preisfreigabe erstellt.');
    console.log('  Stripe setup complete.');
  } else {
    console.log('\nSkipping Stripe setup (STRIPE_SECRET_KEY not set).');
    console.log('  Set STRIPE_SECRET_KEY in .env to create Stripe products/prices.');
  }

  // ── Done ─────────────────────────────────────────────────

  console.log('\nSeed complete!');
  console.log(`  Products: 4 (2 Menschen + 2 Tiere)`);
  console.log(`  Variants: ${kernoelVariants.length} (nur Kürbiskernöl — Kren/Krenpellets Preise folgen)`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
