/**
 * Mascot Definitions — Austria Imperial Green Gold
 *
 * Statische Mascot-Daten aus der Auryx Content Engine (Airtable).
 * Werden hier als Konstanten gehalten, da sich Persoenlichkeit/Stil
 * selten aendern und keine Laufzeit-Abhaengigkeit zu Airtable noetig ist.
 *
 * Quelle: Airtable Base appPZZXh5c2XHJRgu, Tabelle "Maskottchen"
 */

export interface Mascot {
  /** Airtable Record ID */
  recordId: string;
  /** Anzeigename */
  name: string;
  /** Kurzer Titel/Rolle (locale → text, Fallback: en → de) */
  title: Record<string, string>;
  /** Archetyp (z.B. Hueter, Krieger) */
  archetype: string;
  /** Persoenlichkeitsbeschreibung */
  personality: string;
  /** Sprachstil fuer generierten Content */
  speechStyle: string;
  /** Pfad zum Avatar-Bild (relativ zu /public) */
  imageUrl: string;
  /** Welcher Produktkategorie zugeordnet */
  productCategory: 'kernoel' | 'kren' | 'tiernahrung';
  /** Sprechblasen-Text auf Produktseiten (locale → text, Fallback: en → de) */
  speechBubble: Record<string, string>;
}

/**
 * Kerni — Goldhueter des Steirischen Kuerbiskernoel
 *
 * Airtable Record: rec22X2I8cdhmujLu
 * 159+ Content Outputs generiert (Stand Maerz 2026)
 */
export const KERNI: Mascot = {
  recordId: 'rec22X2I8cdhmujLu',
  name: 'Goldhüter Kerni',
  title: {
    de: 'Hüter des Steirischen Goldes',
    en: 'Guardian of Styrian Gold',
    ar: 'حارس الذهب الستيري',
  },
  archetype: 'Hüter',
  personality:
    'Ruhig, selbstbewusst, traditionsbewusst, premium. Spricht wie ein weiser Kenner, der sein Handwerk liebt.',
  speechStyle:
    'Wertig, klar, erzählerisch. Keine Übertreibungen, keine Rabatt-Sprache. Poetisch aber nicht kitschig.',
  imageUrl: '/images/kerni-goldhueter.png',
  productCategory: 'kernoel',
  speechBubble: {
    de: 'Jede Flasche erzählt die Geschichte steirischer Tradition — von der Saat bis zum letzten Tropfen.',
    en: 'Every bottle tells the story of Styrian tradition — from seed to the very last drop.',
    ar: 'كل زجاجة تروي قصة التقاليد الستيرية — من البذرة إلى آخر قطرة.',
  },
};

/**
 * Scharfer Rudi — Krieger fuer Steirischen Kren
 *
 * Airtable Record: tbd (wird nachgetragen sobald Airtable-Eintrag existiert)
 * Avatar-Bild: Placeholder bis finales Bild vorliegt
 */
export const SCHARFER_RUDI: Mascot = {
  recordId: '',
  name: 'Scharfer Rudi',
  title: {
    de: 'Der Steirische Krieger',
    en: 'The Styrian Warrior',
    ar: 'المحارب الستيري',
  },
  archetype: 'Krieger',
  personality:
    'Kraftvoll, direkt, bodenständig. Spricht wie ein ehrlicher Handwerker, der Qualität über alles stellt.',
  speechStyle:
    'Direkt, kernig, humorvoll. Keine Umwege, keine leeren Versprechen. Steirisch-ehrlich.',
  imageUrl: '/images/scharfer-rudi.png',
  productCategory: 'kren',
  speechBubble: {
    de: 'Echter steirischer Kren braucht keine Tricks — nur gute Erde, scharfe Wurzeln und ehrliche Arbeit.',
    en: 'Real Styrian horseradish needs no tricks — just good soil, sharp roots, and honest work.',
    ar: 'الفجل الحار الستيري الأصيل لا يحتاج حيلاً — فقط تربة جيدة وجذور حادة وعمل صادق.',
  },
};

/**
 * Mascot-Lookup nach Produktkategorie
 */
export function getMascotForCategory(
  category: string
): Mascot | null {
  switch (category) {
    case 'kernoel':
      return KERNI;
    case 'kren':
      return SCHARFER_RUDI;
    default:
      return null;
  }
}
