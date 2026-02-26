/**
 * Migration 0003: Partner Revenue Tracking
 *
 * Neue Tabellen:
 * - partner_config: Partner-Konfiguration (Commission %, Stripe Connect, etc.)
 * - partner_commissions: Commission-Records pro Bestellung
 *
 * AIGG = Sonderfall: commission_percent = 0, is_platform_owner = true
 * Zukünftige Auryx-Kunden: commission_percent = 10
 */

-- ─── Enum für Commission Status ────────────────
CREATE TYPE commission_status AS ENUM ('pending', 'paid', 'waived');

-- ─── Partner Config ────────────────────────────
CREATE TABLE partner_config (
  id SERIAL PRIMARY KEY,
  partner_code VARCHAR(50) UNIQUE NOT NULL,
  partner_name VARCHAR(200) NOT NULL,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  stripe_connected_account_id VARCHAR(100),
  is_platform_owner BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Partner Commissions (pro Bestellung) ──────
CREATE TABLE partner_commissions (
  id SERIAL PRIMARY KEY,
  partner_config_id INTEGER NOT NULL REFERENCES partner_config(id),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  order_number VARCHAR(30) NOT NULL,
  order_total_cents INTEGER NOT NULL,
  commission_percent DECIMAL(5,2) NOT NULL,
  commission_cents INTEGER NOT NULL,
  attribution_source VARCHAR(100),
  utm_campaign VARCHAR(100),
  status commission_status NOT NULL DEFAULT 'pending',
  stripe_transfer_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  notes TEXT
);

-- ─── Indexes ───────────────────────────────────
CREATE INDEX idx_partner_commissions_order ON partner_commissions (order_id);
CREATE INDEX idx_partner_commissions_partner ON partner_commissions (partner_config_id);
CREATE INDEX idx_partner_commissions_status ON partner_commissions (status);
CREATE UNIQUE INDEX idx_partner_commissions_unique ON partner_commissions (partner_config_id, order_id);

-- ─── AIGG als ersten Partner anlegen ───────────
-- HISTORISCH: Ursprünglich 0% — wurde in 0004_auryx_revenue_share.sql auf 10% geändert
-- (Strukturvereinbarung 26.02.2026: Auryx = Technologiepartner mit 10% D2C-Nettoumsatz)
INSERT INTO partner_config (partner_code, partner_name, commission_percent, is_platform_owner, active)
VALUES ('aigg', 'Austria Imperial Green Gold', 0.00, true, true);
