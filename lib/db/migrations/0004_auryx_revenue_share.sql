-- Migration 0004: Auryx Revenue Share (Strukturvereinbarung 26.02.2026)
--
-- Auryx AI LLC ist offizieller Technologiepartner der AIGG GmbH.
-- Auryx erhält 10% vom D2C-Nettoumsatz (Revenue - Payment Fees).
-- Revenue-Waterfall: Bruttogewinn → Auryx 10% → Rest 50/50 (Peter/Gottfried)
--
-- Änderungen:
-- 1. financial_ledger: Neue Spalte auryx_share_cents (default 0 für bestehende Einträge)
-- 2. monthly_reports: Neue Spalte total_auryx_cents (default 0 für bestehende Reports)
-- 3. partner_config: AIGG commission_percent von 0 auf 10 aktualisieren

-- ─── 1. Financial Ledger: Auryx-Anteil ──────────
ALTER TABLE financial_ledger
  ADD COLUMN auryx_share_cents INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN financial_ledger.auryx_share_cents IS
  'Auryx AI 10% D2C-Nettoumsatz — Technologiepartner-Vergütung (Strukturvereinbarung 26.02.2026)';

-- ─── 2. Monthly Reports: Auryx-Summe ────────────
ALTER TABLE monthly_reports
  ADD COLUMN total_auryx_cents INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN monthly_reports.total_auryx_cents IS
  'Auryx AI 10% Gesamtsumme pro Monat';

-- ─── 3. AIGG Partner Config: 0% → 10% ──────────
-- Auryx ist Technologiepartner, nicht mehr "platform owner" im alten Sinn.
-- Commission wird ab jetzt als "pending" berechnet, nicht "waived".
UPDATE partner_config
SET commission_percent = 10.00,
    is_platform_owner = false,
    updated_at = NOW()
WHERE partner_code = 'aigg';
