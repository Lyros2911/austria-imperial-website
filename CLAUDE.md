# AUSTRIA IMPERIAL GREEN GOLD — Projektregeln

> **LIES DAS KOMPLETT BEVOR DU IRGENDETWAS AENDERST.**

## Status: PRODUKTIV (v2.0 — 2026-03-13)

Dieses Projekt ist **LIVE** unter https://austriaimperial.com

**Austria Imperial Green Gold ist ein gemeinnuetziger Verein.**
Die Webseite dokumentiert als wissenschaftliche Studie/Expedition, wie KI-generierter Content steirische Spezialitaeten in der Welt bekannt machen kann.

**KEIN kommerzieller Verkauf. KEIN Shop. KEIN Checkout. KEINE Gewinnbeteiligung.**

---

## ABSOLUTE VERBOTE

1. **NIEMALS** eine 50/50-Regelung oder Gewinnbeteiligung implementieren — gibt es nicht mehr
2. **NIEMALS** einen Shop oder Checkout bauen — gemeinnuetziger Verein
3. **NIEMALS** `deploy.sh` aendern ohne die ENV-Variablen zu pruefen
4. **NIEMALS** `.env` ueberschreiben — nur ergaenzen
5. **NIEMALS** npm packages updaten oder hinzufuegen ohne Rueckfrage
6. **NIEMALS** die Datenbankstruktur migrieren ohne explizite Bestaetigung

## WAS DU AENDERN DARFST

- `app/page.tsx`, `app/about/page.tsx` — Seiteninhalt/Design
- `components/*` — UI-Komponenten
- `app/globals.css` — Styling
- `public/*` — Bilder, Assets
- `app/legal/*` — Rechtliche Seiten (Impressum, etc.)
- `app/contact/*` — Kontaktformular UI
- `app/expedition/*` — Expedition/Studie Seiten

## ZWECK DER WEBSEITE

Die Webseite erzaehlt die Geschichte einer Expedition:
- Wie KI (AURYX) Content fuer steirische Spezialitaeten erstellt
- Wie dieser Content auf Social Media veroeffentlicht wird
- Wie die Produkte (Kernoel, Kren) dadurch internationale Aufmerksamkeit bekommen
- Wissenschaftliche Dokumentation der Ergebnisse

**Maskottchen:** Kerni (fuer Kernoel) und Scharfer Rudi (fuer Kren)

## COMPLIANCE (PFLICHT)

- KEINE Health Claims, KEINE Heilversprechen
- KEINE erfundenen Fakten, KEINE falschen Superlative
- Erlaubt: Kulinarische Vorschlaege, Geschmacksbeschreibungen, Herkunftsangaben
- Alles muss als Studie/Forschungsprojekt gekennzeichnet sein

## DEPLOY

```bash
# Via GitHub Actions (Push auf main)
# Oder manuell:
cd /opt/austria-imperial-website && git pull && docker compose up -d --build
```

Container: `austria-imperial` auf `n8n_default` Netzwerk via Traefik.

## VOR JEDER AENDERUNG

1. `git status` pruefen
2. `git diff` anschauen
3. Aenderung committen BEVOR du deployst
4. Nach Deploy: `docker logs austria-imperial --tail 20` pruefen
5. Website testen: `curl -I https://austriaimperial.com`

## ALTE DATEIEN ZUM LOESCHEN

Die folgenden Dateien stammen aus dem alten Shop-Modell und sollten entfernt werden:

```
lib/orders/accounting.ts         → Alte 50/50 Gewinnberechnung
lib/orders/refund.ts             → Altes Refund-Handling
lib/producers/dispatch.ts        → Altes Producer-Routing
lib/producers/kiendler.ts        → Alter Kiendler-Client
lib/producers/hernach.ts         → Alter Hernach-Client
lib/reporting/generate-report.ts → Altes Monatsreporting
lib/db/migrations/0004_auryx_revenue_share.sql → Alte Revenue Share Migration
AUDIT_REPORT.md                  → Alter Audit-Report
```
