export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { products, productVariants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { AddToCartSection } from '@/components/products/add-to-cart';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
  });

  return {
    title: product?.nameDe ?? 'Produkt',
    description: product?.descriptionDe ?? undefined,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      variants: {
        where: eq(productVariants.isActive, true),
        orderBy: (v, { asc }) => [asc(v.priceCents)],
      },
    },
  });

  if (!product) notFound();

  const isKernoel = product.category === 'kernoel';

  return (
    <div className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Image area */}
          <div className="relative aspect-square rounded-lg overflow-hidden">
            {isKernoel ? (
              <Image
                src="/images/kernoel-flaschen.jpg"
                alt={product.nameDe}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <Image
                src="/images/kren-produkte.jpg"
                alt={product.nameDe}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            )}
            {/* g.g.A. badge for Kernöl */}
            {isKernoel && (
              <div className="absolute top-6 left-6 z-10">
                <span className="text-gold/80 text-[10px] tracking-[0.3em] uppercase bg-[var(--aigg-black)]/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-border-gold">
                  g.g.A. Zertifiziert
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {isKernoel ? 'Steirisches Kürbiskernöl' : 'Steirischer Kren'}
            </p>

            <h1 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-6">
              {product.nameDe}
            </h1>

            <p className="text-muted text-base leading-relaxed mb-10">
              {product.descriptionDe}
            </p>

            {/* Variant Selection + Add to Cart (Client Component) */}
            <AddToCartSection
              product={{
                id: product.id,
                slug: product.slug,
                nameDe: product.nameDe,
                producer: product.producer,
              }}
              variants={product.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                nameDe: v.nameDe,
                priceCents: v.priceCents,
                sizeMl: v.sizeMl,
              }))}
            />

            {/* Details */}
            <div className="mt-12 pt-8 border-t border-border space-y-4">
              <DetailRow label="Herkunft" value="Steiermark, Österreich" />
              <DetailRow label="Erzeuger" value={product.producer === 'kiendler' ? 'Familie Kiendler' : 'Hof Hernach'} />
              {isKernoel && <DetailRow label="Zertifizierung" value="g.g.A. (geschützte geographische Angabe)" />}
              <DetailRow label="Versand" value="Innerhalb von 3–5 Werktagen" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-cream">{value}</span>
    </div>
  );
}
