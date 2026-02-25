# AUSTRIA IMPERIAL GREEN GOLD — Projektregeln

> **LIES DAS KOMPLETT BEVOR DU IRGENDETWAS AENDERST.**

## Status: PRODUKTIV (v1.2 — 2026-02-25)

Dieses Projekt ist **LIVE** unter https://austriaimperial.com
Echte Kunden bestellen hier. Jede Aenderung kann Bestellungen brechen.

---

## ABSOLUTE VERBOTE

1. **NIEMALS** `lib/db/schema.ts` aendern — Datenbankschema ist fixiert
2. **NIEMALS** `app/api/stripe/webhook/route.ts` umbauen — Zahlungsfluss ist getestet
3. **NIEMALS** `lib/producers/dispatch.ts` umbauen — Producer-Routing funktioniert
4. **NIEMALS** `lib/airtable/*` umbauen — Airtable-Sync ist getestet und live
5. **NIEMALS** `lib/orders/create-order.ts` aendern — Financial Ledger ist APPEND-ONLY
6. **NIEMALS** `deploy.sh` aendern ohne die ENV-Variablen zu pruefen
7. **NIEMALS** `.env` ueberschreiben — nur ergaenzen
8. **NIEMALS** npm packages updaten oder hinzufuegen ohne Rueckfrage
9. **NIEMALS** die Datenbankstruktur migrieren ohne explizite Bestaetigung

## KRITISCHE DATEIEN (Finger weg!)

```
app/api/stripe/webhook/route.ts    → Stripe Zahlungsverarbeitung
lib/orders/create-order.ts         → Bestellerstellung + Financial Ledger
lib/producers/dispatch.ts          → Kiendler/Hernach Versand
lib/producers/kiendler.ts          → Kiendler Email-Integration
lib/producers/hernach.ts           → Hernach Email-Integration
lib/airtable/sync.ts               → Airtable Live-Tracking
lib/airtable/client.ts             → Airtable API Client
lib/airtable/config.ts             → Airtable Tabellennamen + Base-ID
lib/airtable/types.ts              → Airtable Feldnamen (muessen mit Airtable uebereinstimmen!)
lib/attribution.ts                 → UTM Cookie Capture + Parsing
lib/orders/commission.ts           → Partner Commission Engine
lib/payments/connect.ts            → Stripe Connect Integration
lib/db/schema.ts                   → PostgreSQL Schema (Neon DB)
lib/db/drizzle.ts                  → Datenbankverbindung
lib/email/order-confirmation.ts    → Kunden- und Office-Emails
deploy.sh                          → Docker Deploy mit ENV-Variablen
```

## WAS DU AENDERN DARFST

- `app/page.tsx`, `app/about/page.tsx` — Seiteninhalt/Design
- `app/products/*` — Produktdarstellung (NICHT die API)
- `components/*` — UI-Komponenten
- `app/globals.css` — Styling
- `public/*` — Bilder, Assets
- `app/legal/*` — Rechtliche Seiten (AGB, Impressum, etc.)
- `app/contact/*` — Kontaktformular UI

## ARCHITEKTUR-UEBERBLICK

```
Content-Link mit UTM-Parametern (utm_campaign=auryx_engine)
  └→ AttributionCapture (Client Component) → Cookie (30 Tage)
      └→ Checkout API liest Cookie → Stripe Session Metadata
          └→ Stripe Connect (nur bei commission > 0, NICHT fuer AIGG)
              └→ Stripe Zahlung

Stripe Zahlung
  └→ Webhook (route.ts)
      ├→ createOrder() → PostgreSQL (Orders + Fulfillment + Ledger + Attribution)
      ├→ calculateAndStoreCommission() → partner_commissions (waived fuer AIGG)
      │    └→ syncCommissionToAirtable() → "Partner Revenue"
      ├→ syncOrderToAirtable() → "Austria Imperial Bestellungen" (+ Quelle, UTM)
      ├→ syncFulfillmentToAirtable() → "Shop Kuerbiskernoel" / "Shop Kren"
      ├→ dispatchFulfillmentOrders() → Email an Kiendler/Hernach
      │    └→ updateFulfillmentInAirtable() + logCommunicationToAirtable()
      ├→ sendOrderConfirmation/Notification → Kunden + Office Emails
      │    └→ logCommunicationToAirtable()
      └→ handlePaymentIntentSucceeded() → markCommissionPaid() (Stripe Connect)
```

## STRIPE CONNECT (Revenue Share)

```
AIGG (aktuell):
  commission_percent = 0, is_platform_owner = true
  → Kein Stripe Connect, normaler Checkout
  → Commissions mit Status "waived"

Zukuenftige Auryx-Kunden:
  commission_percent = 10
  → Stripe Connected Account
  → application_fee_amount = 10% vom Gesamtbetrag
  → Automatische Auszahlung via Stripe
  → Commission Status: pending → paid

Konfiguration:
  ENV: PARTNER_CODE=aigg (default)
  DB: partner_config Tabelle
  Code: lib/payments/connect.ts
```

## PRODUCER-ROUTING

| Producer | Produkte | Tabelle |
|----------|----------|---------|
| kiendler | Kuerbiskernoel | Shop Kuerbiskernoel |
| hernach  | Kren | Shop Kren |

## DATENBANK

- **PostgreSQL auf Neon** (Source of Truth)
- **Airtable** = Live-Mirror (non-blocking, darf nie Bestellungen blockieren)
- Financial Ledger ist APPEND-ONLY mit 50/50 Split (Peter/AIGG)

## DEPLOY

```bash
cd /opt/austria-imperial-website && bash deploy.sh
```

Container: `austria-imperial` auf `n8n_default` Netzwerk via Traefik.

## VOR JEDER AENDERUNG

1. `git status` pruefen
2. `git diff` anschauen
3. Aenderung committen BEVOR du deployst
4. Nach Deploy: `docker logs austria-imperial --tail 20` pruefen
5. Website testen: `curl -I https://austriaimperial.com`

## BEI PROBLEMEN

- Webhook-Fehler? → `docker logs austria-imperial 2>&1 | grep "Stripe Webhook"`
- Airtable-Fehler? → `docker logs austria-imperial 2>&1 | grep "Airtable"`
- Bestellung fehlt? → PostgreSQL ist Source of Truth, NICHT Airtable
