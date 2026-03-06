'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { useMascot } from './mascot-context';
import { trackABEvent } from '@/lib/ab-tracking';
import type { Mascot } from '@/lib/mascots';

interface MascotCardProps {
  mascot: Mascot;
  productSlug: string;
}

/**
 * MascotCard — Zeigt das Maskottchen auf Produktseiten an.
 *
 * - Nur sichtbar wenn A/B-Variante = 'A' (Avatar-Gruppe)
 * - Trackt 'avatar_impression' bei Render
 * - Trackt 'avatar_click' bei Klick
 * - Premium-Design: goldene Akzente, passend zum AIGG-Stilsystem
 */
export function MascotCard({ mascot, productSlug }: MascotCardProps) {
  const { isAvatarVisible } = useMascot();
  const locale = useLocale();
  const impressionTracked = useRef(false);
  const t = useTranslations('mascot');

  // Impression-Tracking (einmal pro Render)
  useEffect(() => {
    if (isAvatarVisible && !impressionTracked.current) {
      impressionTracked.current = true;
      trackABEvent('avatar_impression', { productSlug, locale });
    }
  }, [isAvatarVisible, productSlug, locale]);

  // Variante B oder noch nicht geladen → nichts rendern
  if (!isAvatarVisible) return null;

  const handleClick = () => {
    trackABEvent('avatar_click', {
      productSlug,
      locale,
      metadata: { mascotName: mascot.name },
    });
  };

  const title = mascot.title[locale] ?? mascot.title.en ?? mascot.title.de;
  const speechBubble = mascot.speechBubble[locale] ?? mascot.speechBubble.en ?? mascot.speechBubble.de;

  return (
    <div
      onClick={handleClick}
      className="group relative bg-surface border border-gold/20 rounded-lg p-6 cursor-pointer transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_20px_rgba(197,165,90,0.08)]"
    >
      {/* Studien-Badge */}
      <div className="absolute top-3 right-3">
        <span className="text-[9px] text-gold/40 tracking-[0.2em] uppercase">
          {t('studyBadge')}
        </span>
      </div>

      <div className="flex items-start gap-5">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gold/30 group-hover:border-gold/50 transition-colors">
            <Image
              src={mascot.imageUrl}
              alt={mascot.name}
              fill
              className="object-cover object-center"
              sizes="80px"
            />
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="font-[var(--font-heading)] text-gold text-sm font-semibold mb-0.5">
            {mascot.name}
          </h3>
          <p className="text-gold/50 text-[10px] tracking-[0.15em] uppercase mb-3">
            {title}
          </p>

          {/* Sprechblase */}
          <div className="relative bg-[var(--aigg-black)] border border-border rounded-lg px-4 py-3">
            {/* Sprechblasen-Pfeil */}
            <div className="absolute -left-2 top-4 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-border border-b-[6px] border-b-transparent" />
            <div className="absolute -left-[7px] top-4 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-[var(--aigg-black)] border-b-[6px] border-b-transparent" />
            <p className="text-cream/80 text-xs leading-relaxed italic">
              &ldquo;{speechBubble}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
