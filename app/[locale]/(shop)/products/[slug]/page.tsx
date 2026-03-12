export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/drizzle';
import { products, productVariants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { AddToCartSection } from '@/components/products/add-to-cart';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getLocalizedField } from '@/lib/i18n-helpers';
import { ABPageView } from '@/components/ab-page-view';
import { MascotCard } from '@/components/mascot/mascot-card';
import { StudyNotice } from '@/components/study-notice';
import { getMascotForCategory } from '@/lib/mascots';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

const CATEGORY_IMAGES: Record<string, string> = {
  kernoel: '/images/kernoel-flaschen.jpg',
  kren: '/images/kren-produkte.jpg',
  tiernahrung: '/images/kren-produkte.jpg',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
  });

  const name = product
    ? getLocalizedField(product as unknown as Record<string, unknown>, 'name', locale)
    : 'Produkt';
  const desc = product
    ? getLocalizedField(product as unknown as Record<string, unknown>, 'description', locale)
    : undefined;

  return {
    title: name,
    description: desc,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'productDetail' });

  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      variants: {
        where: eq(productVariants.isActive, true),
        orderBy: (v, { asc }) => [asc(v.priceCents)],
      },
    },
  });

  if (!product || !product.isActive) notFound();

  const isKernoel = product.category === 'kernoel';
  const hasVariants = product.variants.length > 0;
  const categoryLabel = t(`categories.${product.category}`);
  const imageSrc = CATEGORY_IMAGES[product.category] ?? '/images/kren-produkte.jpg';
  const producerName = t(`producers.${product.producer}`);
  const productName = getLocalizedField(product as unknown as Record<string, unknown>, 'name', locale);
  const productDesc = getLocalizedField(product as unknown as Record<string, unknown>, 'description', locale);
  const mascot = getMascotForCategory(product.category);

  return (
    <div className="py-16 px-6">
      {/* A/B Test: Page-View-Tracking */}
      <ABPageView productSlug={product.slug} locale={locale} />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Image area */}
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <Image
              src={imageSrc}
              alt={productName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {isKernoel && (
              <div className="absolute top-6 left-6 z-10">
                <span className="text-gold/80 text-[10px] tracking-[0.3em] uppercase bg-[var(--aigg-black)]/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-border-gold">
                  {t('ggaBadge')}
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <p className="text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {categoryLabel}
            </p>

            <h1 className="font-[var(--font-heading)] text-3xl sm:text-4xl text-cream font-semibold mb-6">
              {productName}
            </h1>

            <div className="text-muted text-base leading-relaxed mb-10 space-y-4">
              {productDesc.split('\n\n').map((paragraph: string, i: number) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {hasVariants ? (
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
            ) : (
              <div className="bg-surface border border-border rounded-lg p-6 space-y-3">
                <p className="text-gold/80 font-[var(--font-heading)] text-lg font-semibold">
                  {t('comingSoon.title')}
                </p>
                <p className="text-muted text-sm leading-relaxed">
                  {t('comingSoon.description')}
                </p>
              </div>
            )}

            {/* Details */}
            <div className="mt-12 pt-8 border-t border-border space-y-4">
              <DetailRow label={t('origin')} value={t('originValue')} />
              <DetailRow label={t('producer')} value={producerName} />
              {isKernoel && <DetailRow label={t('certification')} value={t('certificationValue')} />}
              {product.category === 'tiernahrung' && (
                <DetailRow
                  label={t('targetAudience')}
                  value={product.slug.includes('pferde') ? t('horses') : t('camels')}
                />
              )}
              <DetailRow label={t('shipping')} value={t('shippingValue')} />
            </div>

            {/* Mascot Card — nur fuer Variante A (A/B-Test) */}
            {mascot && (
              <MascotCard mascot={mascot} productSlug={product.slug} />
            )}

            {/* DSGVO-Studienhinweis */}
            <StudyNotice />
          </div>
        </div>

        {/* Extended product info sections — Kürbiskernöl */}
        {isKernoel && (
          <div className="mt-20 space-y-16">

            {/* Sensorik / Verkostung */}
            <section>
              <h2 className="font-[var(--font-heading)] text-2xl text-cream font-semibold mb-8 text-center">
                {locale === 'de' ? 'Sensorik & Verkostung' : locale === 'ar' ? 'الحواس والتذوق' : 'Sensory Profile & Tasting'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SensorikCard
                  icon="👁️"
                  title={locale === 'de' ? 'Aussehen' : locale === 'ar' ? 'المظهر' : 'Appearance'}
                  text={locale === 'de'
                    ? 'Einzigartiger Dichromatismus: In dünner Schicht leuchtend grün, in dicker Schicht tiefrot bis braun. Dickflüssig, samtig.'
                    : locale === 'ar'
                    ? 'ثنائية لونية فريدة: أخضر زاهٍ في الطبقات الرقيقة، أحمر غامق في الطبقات السميكة.'
                    : 'Unique dichromatism: vivid green in thin layers, deep red to brown in thick layers. Thick, velvety texture.'}
                />
                <SensorikCard
                  icon="👃"
                  title={locale === 'de' ? 'Aroma' : locale === 'ar' ? 'العطر' : 'Aroma'}
                  text={locale === 'de'
                    ? 'Fein nussig mit Noten von frischer Walnuss, Karamell und frischer Brotrinde. Einladend und aromatisch.'
                    : locale === 'ar'
                    ? 'رائحة جوزية ناعمة مع لمسات من الجوز الطازج والكراميل وقشرة الخبز الطازجة.'
                    : 'Fine nutty notes with fresh walnut, caramel, and fresh bread crust. Inviting and aromatic.'}
                />
                <SensorikCard
                  icon="👅"
                  title={locale === 'de' ? 'Geschmack' : locale === 'ar' ? 'المذاق' : 'Taste'}
                  text={locale === 'de'
                    ? 'Intensiv nussig, leicht süßlich mit feinen Röst- und Karamellnoten. Harmonisch, rund, mit Nuancen von Schokolade.'
                    : locale === 'ar'
                    ? 'نكهة جوزية مكثفة، حلوة قليلاً مع لمسات تحميص وكراميل ناعمة.'
                    : 'Intensely nutty, slightly sweet with fine roasting and caramel notes. Harmonious, round, with chocolate nuances.'}
                />
                <SensorikCard
                  icon="✨"
                  title={locale === 'de' ? 'Qualitätstest' : locale === 'ar' ? 'اختبار الجودة' : 'Quality Test'}
                  text={locale === 'de'
                    ? 'Tropfenprobe: Ein Tropfen auf weißem Teller zeigt grün-kastanienbraune Farbe. Reines Erstpressöl hält zusammen.'
                    : locale === 'ar'
                    ? 'اختبار القطرة: قطرة على طبق أبيض تُظهر لوناً أخضر-بنياً. الزيت النقي يبقى متماسكاً.'
                    : 'Drop test: A drop on a white plate shows green-chestnut color. Pure first-pressing oil holds together.'}
                />
              </div>
            </section>

            {/* Nährwerte */}
            <section>
              <h2 className="font-[var(--font-heading)] text-2xl text-cream font-semibold mb-8 text-center">
                {locale === 'de' ? 'Nährwerte & Inhaltsstoffe' : locale === 'ar' ? 'القيم الغذائية' : 'Nutritional Values'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <NutrientCard
                  title={locale === 'de' ? 'Vitamin E' : 'Vitamin E'}
                  value="56 mg"
                  unit="/100 ml"
                  detail={locale === 'de'
                    ? '560% der empfohlenen Tagesdosis. Starker Antioxidans-Schutz.'
                    : locale === 'ar'
                    ? '560% من الجرعة اليومية الموصى بها. حماية مضادة للأكسدة قوية.'
                    : '560% of recommended daily intake. Powerful antioxidant protection.'}
                />
                <NutrientCard
                  title={locale === 'de' ? 'Phytosterole' : locale === 'ar' ? 'فيتوستيرول' : 'Phytosterols'}
                  value="400 mg"
                  unit="/100 ml"
                  detail={locale === 'de'
                    ? 'Beta-Sitosterol & Delta-7-Sterin. Unterstützen den Cholesterinspiegel.'
                    : locale === 'ar'
                    ? 'بيتا سيتوستيرول ودلتا-7-ستيرين. تدعم مستوى الكوليسترول.'
                    : 'Beta-sitosterol & Delta-7-sterol. Support cholesterol levels.'}
                />
                <NutrientCard
                  title={locale === 'de' ? 'Ungesättigte Fettsäuren' : locale === 'ar' ? 'أحماض دهنية غير مشبعة' : 'Unsaturated Fatty Acids'}
                  value="> 80%"
                  unit=""
                  detail={locale === 'de'
                    ? 'Linolsäure (Omega-6): 47–52%, Ölsäure (Omega-9): 28–30%. Cholesterinfrei.'
                    : locale === 'ar'
                    ? 'حمض اللينوليك (أوميغا-6): 47-52%، حمض الأوليك (أوميغا-9): 28-30%.'
                    : 'Linoleic acid (Omega-6): 47–52%, Oleic acid (Omega-9): 28–30%. Cholesterol-free.'}
                />
              </div>
            </section>

            {/* g.g.A. Herkunftsschutz */}
            <section className="bg-surface border border-border rounded-lg p-8 md:p-12">
              <div className="max-w-3xl mx-auto text-center">
                <p className="text-gold text-xs tracking-[0.3em] uppercase mb-4">
                  {locale === 'de' ? 'EU-Herkunftsschutz seit 1996' : locale === 'ar' ? 'حماية المنشأ الأوروبية منذ 1996' : 'EU Protected Origin since 1996'}
                </p>
                <h2 className="font-[var(--font-heading)] text-2xl text-cream font-semibold mb-6">
                  {locale === 'de' ? 'Geschützte Geografische Angabe (g.g.A.)' : locale === 'ar' ? 'المؤشر الجغرافي المحمي' : 'Protected Geographical Indication (PGI)'}
                </h2>
                <p className="text-muted leading-relaxed mb-6">
                  {locale === 'de'
                    ? 'Jede Flasche trägt eine Banderole mit individueller Kontrollnummer — lückenlose Rückverfolgbarkeit vom steirischen Feld bis zu Ihrem Teller. Über 3.700 Produzenten und 40 Ölmühlen bilden die Gemeinschaft Steirisches Kürbiskernöl g.g.A. nach EU-Verordnung 1151/2012.'
                    : locale === 'ar'
                    ? 'كل زجاجة تحمل شريطاً بالرقم الرقابي الفردي — تتبع كامل من الحقل الستيري إلى طبقك. أكثر من 3,700 منتج و40 مطحنة زيت يشكلون مجتمع زيت بذور اليقطين الستيري.'
                    : 'Each bottle carries a banderole with an individual control number — complete traceability from Styrian fields to your plate. Over 3,700 producers and 40 oil mills form the Steirisches Kürbiskernöl PGI community under EU Regulation 1151/2012.'}
                </p>
                <div className="flex flex-wrap justify-center gap-6 text-sm text-muted">
                  <span>🌿 100% Cucurbita pepo var. styriaca</span>
                  <span>🏔️ {locale === 'de' ? 'Steiermark, Österreich' : locale === 'ar' ? 'ستيريا، النمسا' : 'Styria, Austria'}</span>
                  <span>🔒 {locale === 'de' ? 'EU-Verordnung 1151/2012' : 'EU Regulation 1151/2012'}</span>
                </div>
              </div>
            </section>

            {/* Verwendung */}
            <section>
              <h2 className="font-[var(--font-heading)] text-2xl text-cream font-semibold mb-8 text-center">
                {locale === 'de' ? 'Verwendung' : locale === 'ar' ? 'الاستخدام' : 'Usage'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { de: 'Salate & Dressings', en: 'Salads & Dressings', ar: 'السلطات والصلصات' },
                  { de: 'Suppen (kalt aufträufeln)', en: 'Soups (drizzle cold)', ar: 'الشوربات (تُرش باردة)' },
                  { de: 'Vanilleeis', en: 'Vanilla Ice Cream', ar: 'آيس كريم الفانيليا' },
                  { de: 'Steirischer Käferbohnensalat', en: 'Styrian Bean Salad', ar: 'سلطة الفاصوليا الستيرية' },
                ].map((item, i) => (
                  <div key={i} className="bg-surface border border-border rounded-lg p-4 text-center">
                    <span className="text-cream text-sm">{locale === 'de' ? item.de : locale === 'ar' ? item.ar : item.en}</span>
                  </div>
                ))}
              </div>
              <p className="text-gold/60 text-xs text-center mt-4 tracking-wider">
                ⚠️ {locale === 'de' ? 'Niemals erhitzen — Rauchpunkt 120°C' : locale === 'ar' ? 'لا تسخّنه أبداً — نقطة الدخان 120 درجة مئوية' : 'Never heat — smoke point 120°C'}
              </p>
            </section>
          </div>
        )}
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

function SensorikCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-6 text-center space-y-3">
      <span className="text-3xl">{icon}</span>
      <h3 className="font-[var(--font-heading)] text-lg text-cream font-semibold">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function NutrientCard({ title, value, unit, detail }: { title: string; value: string; unit: string; detail: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-6 text-center space-y-3">
      <h3 className="text-gold/80 text-xs tracking-[0.2em] uppercase">{title}</h3>
      <p className="font-[var(--font-heading)] text-3xl text-cream font-bold">
        {value}<span className="text-lg text-muted font-normal">{unit}</span>
      </p>
      <p className="text-muted text-sm leading-relaxed">{detail}</p>
    </div>
  );
}
