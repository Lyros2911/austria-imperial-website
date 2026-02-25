/**
 * Seed Script - Austria Imperial Green Gold
 *
 * Creates initial products and variants in the database.
 * Optionally creates Stripe products/prices if STRIPE_SECRET_KEY is set.
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

  const [kren] = await db
    .insert(products)
    .values({
      slug: 'steirischer-kren',
      nameDe: 'Steirischer Kren (Meerrettich)',
      nameEn: 'Styrian Horseradish',
      descriptionDe:
        'Frisch geriebener steirischer Kren aus traditionellem Anbau. ' +
        'Scharfer, würziger Geschmack — ein Klassiker der österreichischen Küche.',
      descriptionEn:
        'Freshly grated Styrian horseradish from traditional cultivation. ' +
        'Sharp, spicy flavor — a classic of Austrian cuisine.',
      category: 'kren',
      producer: 'hernach',
    })
    .returning();

  console.log(`  Created: ${kernoel.nameDe} (id: ${kernoel.id})`);
  console.log(`  Created: ${kren.nameDe} (id: ${kren.id})`);

  // ── 2. Product Variants ──────────────────────────────────

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

  const krenVariants = await db
    .insert(productVariants)
    .values([
      {
        productId: kren.id,
        sku: 'KRN-100',
        nameDe: '100g Glas',
        nameEn: '100g jar',
        sizeMl: 100,
        priceCents: 490, // EUR 4,90
        weightGrams: 220,
      },
      {
        productId: kren.id,
        sku: 'KRN-200',
        nameDe: '200g Glas',
        nameEn: '200g jar',
        sizeMl: 200,
        priceCents: 690, // EUR 6,90
        weightGrams: 350,
      },
      {
        productId: kren.id,
        sku: 'KRN-500',
        nameDe: '500g Glas',
        nameEn: '500g jar',
        sizeMl: 500,
        priceCents: 1190, // EUR 11,90
        weightGrams: 720,
      },
    ])
    .returning();

  for (const v of [...kernoelVariants, ...krenVariants]) {
    console.log(`  Created: ${v.sku} — ${v.nameDe} (EUR ${(v.priceCents / 100).toFixed(2)})`);
  }

  // ── 3. Stripe Products + Prices (optional) ──────────────

  if (process.env.STRIPE_SECRET_KEY) {
    console.log('\nCreating Stripe products and prices...');

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create Stripe products
    const stripeKernoel = await stripe.products.create({
      name: 'Steirisches Kürbiskernöl g.g.A.',
      description: 'Premium cold-pressed Styrian pumpkin seed oil (PGI)',
      metadata: { aigg_product_id: String(kernoel.id) },
    });

    const stripeKren = await stripe.products.create({
      name: 'Steirischer Kren',
      description: 'Styrian horseradish from traditional cultivation',
      metadata: { aigg_product_id: String(kren.id) },
    });

    // Create Stripe prices and update variants
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

    for (const variant of krenVariants) {
      const price = await stripe.prices.create({
        product: stripeKren.id,
        unit_amount: variant.priceCents,
        currency: 'eur',
        metadata: {
          aigg_variant_id: String(variant.id),
          sku: variant.sku,
        },
      });

      await sql`UPDATE product_variants SET stripe_price_id = ${price.id} WHERE id = ${variant.id}`;

      console.log(`  Stripe price: ${variant.sku} → ${price.id}`);
    }

    console.log('  Stripe setup complete.');
  } else {
    console.log('\nSkipping Stripe setup (STRIPE_SECRET_KEY not set).');
    console.log('  Set STRIPE_SECRET_KEY in .env to create Stripe products/prices.');
  }

  // ── Done ─────────────────────────────────────────────────

  console.log('\nSeed complete!');
  console.log(`  Products: 2`);
  console.log(`  Variants: ${kernoelVariants.length + krenVariants.length} (${kernoelVariants.length} Kernöl + ${krenVariants.length} Kren)`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
