'use client';

import { useTranslations } from 'next-intl';
import { GraduationCap } from 'lucide-react';

/**
 * DSGVO-konformer Studienhinweis fuer Produktseiten.
 *
 * Dezenter Hinweis dass die Seite Teil einer wissenschaftlichen Studie ist
 * (KI-Avatar-Verkaufsstudie, AIGG Verein).
 *
 * Pflicht gemaess Datenschutz: Besucher muessen wissen, dass anonyme
 * Daten fuer Forschungszwecke erhoben werden.
 */
export function StudyNotice() {
  const t = useTranslations('studyNotice');

  return (
    <div className="mt-8 p-4 bg-surface border border-border rounded-lg">
      <div className="flex items-start gap-3">
        <GraduationCap className="w-4 h-4 text-gold/60 mt-0.5 flex-shrink-0" />
        <p className="text-muted text-xs leading-relaxed">{t('text')}</p>
      </div>
    </div>
  );
}
