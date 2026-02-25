# Austria Imperial Green Gold – Produktwebseite

> **Status:** Grundgeruest (Next.js 16 Boilerplate), kein eigener Content
> **Stand:** 2026-02-16

---

## Was ist Austria Imperial?

Austria Imperial Green Gold (AIGG) ist ein Premium-Lebensmittelunternehmen, das steirisches Kuerbiskernoel mit g.g.A.-Schutz (geschuetzte geographische Angabe) vermarktet.

Diese Webseite hat eine **Doppelfunktion:**
1. **Reputationsplattform** – Professioneller Markenauftritt
2. **Produktshop** – Direkter Kauf von Kernoel und Kren

---

## Zusammenhang mit Auryx

```
Auryx Content Engine (auryx-core)
  |
  |-- Generiert taeglich Content fuer AIGG
  |-- Text + Bilder + Videos (automatisiert)
  |-- Veroeffentlicht auf Social Media
  |
  +---> Traffic landet auf DIESER Webseite
        |-- Produkte anschauen
        |-- Direkt kaufen (Stripe Checkout)
        |-- Anfrage stellen (Kontaktformular)
```

**AIGG ist der erste Partner/Kunde der Auryx-Plattform.**
Content wird von Auryx geliefert, aber die Webseite ist eigenstaendig.

---

## Produkte

### Steirisches Kuerbiskernoel g.g.A.
- **Varianten:** 200ml, 250ml, 500ml
- **Herstellung:** Kaltgepresst aus 100% steirischen Kuerbiskernen
- **Zertifizierung:** g.g.A. (EU-Herkunftsschutz)
- **USPs:** Kaltgepresst, 100% Kuerbiskerne, steirische Herkunft, nussiges Aroma

### Kren (Meerrettich)
- Details noch in Planung

### AI-Maskottchen: Kerni
- KI-Guide fuer Kuerbiskernoel
- Warm, clever, charmant
- Wird als Markengesicht auf der Webseite eingesetzt
- Laeuft ueber die Auryx-Plattform

---

## Tech Stack

| Technologie | Version |
|------------|---------|
| Next.js | 16.1.6 |
| React | 19.2.3 |
| Tailwind CSS | 4 |
| TypeScript | 5 |

---

## Repository-Struktur

```
austria-imperial-website/
|-- README.md              # Diese Datei
|-- package.json           # Dependencies
|-- next.config.ts         # Next.js Konfiguration
|-- tsconfig.json          # TypeScript Config
|-- eslint.config.mjs      # ESLint Config
|-- postcss.config.mjs     # PostCSS (Tailwind)
|-- Dockerfile             # Multi-stage Docker Build (Node 20-alpine)
|-- .dockerignore
|-- .gitignore
|
|-- app/                   # Next.js App Router
|   |-- layout.tsx         # Root Layout
|   |-- page.tsx           # Homepage (aktuell: Default Template)
|   |-- globals.css        # Tailwind + Global Styles
|   |-- favicon.ico
|
|-- public/                # Statische Assets
|   |-- file.svg, globe.svg, next.svg, window.svg
|
|-- .github/
|   |-- workflows/
|   |   |-- ci.yml         # CI Build
|   |   |-- codeql.yml     # CodeQL Security
|   |   |-- pr-review.yml  # PR Review
|   |-- dependabot.yml     # Dependency Updates
```

---

## CI/CD

Drei GitHub Actions sind konfiguriert:

| Workflow | Datei | Trigger |
|----------|-------|---------|
| CI Build | ci.yml | Push + PR |
| CodeQL Security | codeql.yml | Push + Schedule |
| PR Review | pr-review.yml | Pull Request |

Docker: Multi-stage Dockerfile mit Node 20-alpine.

---

## Compliance-Regeln (PFLICHT!)

### Lebensmittelmarketing-Vorschriften
- **KEINE** Health Claims (z.B. "gesund", "heilt", "schuetzt vor")
- **KEINE** Heilversprechen jeglicher Art
- **KEINE** erfundenen Fakten
- **KEINE** Garantien oder absolute Aussagen
- **KEINE** falschen Superlative

### Erlaubt
- Kulinarische Vorschlaege
- Geschmacksbeschreibungen
- Herkunftsangaben
- Bestaetigte Fakten: Steirisch, g.g.A., kaltgepresst, 100% Kuerbiskerne, nussiges Aroma

---

## Bezahlung

- **System:** Stripe Checkout (Einmalzahlungen)
- **Stripe Account:** Auryx AI LLC (gleicher Account wie auryx.cloud)
- **Modell:** Warenkorb + Checkout pro Bestellung (B2C)
- **Status:** Noch nicht implementiert

---

## Was fehlt (Roadmap)

### Kritisch
- [ ] npm install + .env Setup
- [ ] Branding (Logo, Farben, Schriftarten)
- [ ] Homepage mit Produktpraesentation
- [ ] Produkt-Detailseiten (Kernoel, Kren)
- [ ] Kerni-Integration als Markengesicht

### Shop
- [ ] Warenkorb-System
- [ ] Stripe Checkout Integration
- [ ] Bestellanfrage-Formular
- [ ] Versandkosten-Berechnung
- [ ] Bestellbestaetigung

### Content
- [ ] Produktbilder und -beschreibungen
- [ ] Ueber-uns Seite
- [ ] Kontaktseite
- [ ] Impressum + Datenschutz

### Technik
- [x] Hosting: VPS (Docker + Traefik) auf 145.223.80.78
- [x] Domain: austriaimperial.com + .at → VPS
- [ ] Mehrsprachigkeit
- [ ] SEO-Optimierung

---

## Weitere Repos

| Repo | Beschreibung | Sichtbarkeit |
|------|-------------|--------------|
| Lyros2911/austria-imperial-website | Diese Webseite | public |
| Lyros2911/austria-imperial-content | Brand Assets, Marketing-Material | private (leer) |
| Lyros2911/auryx-core | Auryx Content Engine (liefert Content) | private |

---

## Google Cloud

| Feld | Wert |
|------|------|
| Organisation | auryx.cloud (34369344926) |
| Ordner | Austria Imperial Green Gold (222792104471) |
| Projekt | ai-green-gold-prod |
| Billing | Ueber auryx.cloud |

---

## Quick Start

```bash
# Projekt klonen
git clone https://github.com/Lyros2911/austria-imperial-website.git
cd austria-imperial-website

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
# -> http://localhost:3000
```

---

## Dokumentation

| Dokument | Pfad | Beschreibung |
|----------|------|-------------|
| Projekt-Doku | /austria-imperial/AIGG-PROJEKT.md | Detaillierte AIGG-Dokumentation |
| Master CLAUDE.md | /CLAUDE.md | Gesamtuebersicht aller Projekte |
| Auryx Doku | /auryx/auryx-core/docs/Auryx-PROJEKT.md | Content Engine Details |

---

*Letzte Aktualisierung: 2026-02-16 | Austria Imperial Green Gold*
