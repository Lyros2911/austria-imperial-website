/**
 * @deprecated ENTFERNT — 2026-03-13
 *
 * Austria Imperial Green Gold ist seit Maerz 2026 ein gemeinnuetziger Verein.
 * Es gibt KEINEN Checkout / Shop.
 * Diese Datei wird beim naechsten Cleanup geloescht.
 */

import { Link } from '@/i18n/navigation';

export default function CheckoutPage() {
  return (
    <div className="py-32 px-6 text-center">
      <h1 className="font-[var(--font-heading)] text-2xl text-cream mb-4">
        Nicht verfügbar
      </h1>
      <p className="text-muted text-sm mb-6">
        Austria Imperial Green Gold ist ein gemeinnütziger Verein.
        Ein Online-Shop ist nicht verfügbar.
      </p>
      <Link
        href="/"
        className="text-gold text-sm hover:text-gold-light transition-colors"
      >
        ← Zurück zur Startseite
      </Link>
    </div>
  );
}
