-- ============================================================
-- Migration 0005: Vereins-Tabellen
-- Stand: März 2026
-- Erstellt im Rahmen der Umstrukturierung GmbH → Verein
-- ============================================================

-- Enums für Studienberichte
DO $$ BEGIN
  CREATE TYPE study_report_type AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE study_report_status AS ENUM ('draft', 'final', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enums für Vereinsfinanzen
DO $$ BEGIN
  CREATE TYPE transaction_category AS ENUM ('produkte', 'reisen', 'equipment', 'dienstleistungen', 'auryx_rechnung', 'marketing', 'sonstiges');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE board_member AS ENUM ('gottfried', 'peter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_verein AS ENUM ('karte_gottfried', 'karte_peter', 'ueberweisung', 'bar');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enums für Mitglieder
DO $$ BEGIN
  CREATE TYPE member_category AS ENUM ('ordentlich', 'foerder', 'ausserordentlich', 'ehren');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('aktiv', 'ehemalig');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Tabelle: study_reports (Studienberichte)
-- Automatisch generierte Wochen/Monats/Quartalsberichte
-- ============================================================
CREATE TABLE IF NOT EXISTS study_reports (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(30) NOT NULL UNIQUE,
  type study_report_type NOT NULL,
  period_from TIMESTAMP NOT NULL,
  period_to TIMESTAMP NOT NULL,
  total_revenue INTEGER,
  order_count INTEGER,
  average_order_value INTEGER,
  top_content TEXT,
  ai_summary TEXT,
  pdf_url TEXT,
  data_by_language JSONB,
  data_by_market JSONB,
  content_metrics JSONB,
  status study_report_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP
);

-- ============================================================
-- Tabelle: vereinsfinanzen (Finanz-Transaktionen)
-- 1.000-€-Grenze, Gegenzeichnung, Belegpflicht
-- ============================================================
CREATE TABLE IF NOT EXISTS vereinsfinanzen (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(30) NOT NULL UNIQUE,
  date TIMESTAMP NOT NULL,
  amount INTEGER NOT NULL, -- Cent, positiv=Einnahme, negativ=Ausgabe
  category transaction_category NOT NULL,
  description TEXT NOT NULL,
  executed_by board_member NOT NULL,
  is_over_1000 BOOLEAN NOT NULL DEFAULT FALSE,
  countersigned_by board_member,
  countersigned_at TIMESTAMP,
  countersignature_required BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_url TEXT,
  receipt_reference VARCHAR(100),
  payment_method payment_method_verein,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_admin_id INTEGER REFERENCES admin_users(id)
);

-- ============================================================
-- Tabelle: vereinsmitglieder (Mitglieder-Register)
-- Ordentlich, Förder, Außerordentlich, Ehren
-- ============================================================
CREATE TABLE IF NOT EXISTS vereinsmitglieder (
  id SERIAL PRIMARY KEY,
  member_number VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  category member_category NOT NULL,
  join_date TIMESTAMP NOT NULL,
  status member_status NOT NULL DEFAULT 'aktiv',
  gdpr_consent_date TIMESTAMP,
  data_origin VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed: Gründungsmitglieder
-- ============================================================
INSERT INTO vereinsmitglieder (member_number, first_name, last_name, email, category, join_date, status, data_origin)
VALUES
  ('M-001', 'Gottfried', 'Hammerl', 'gottfriedhammerl@gmail.com', 'ordentlich', NOW(), 'aktiv', 'Gründungsmitglied'),
  ('M-002', 'Peter', 'Kräcksammer', 'peter@austriaimperial.com', 'ordentlich', NOW(), 'aktiv', 'Gründungsmitglied')
ON CONFLICT (member_number) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_reports_type ON study_reports(type);
CREATE INDEX IF NOT EXISTS idx_study_reports_period ON study_reports(period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_vereinsfinanzen_date ON vereinsfinanzen(date);
CREATE INDEX IF NOT EXISTS idx_vereinsfinanzen_executed_by ON vereinsfinanzen(executed_by);
CREATE INDEX IF NOT EXISTS idx_vereinsfinanzen_category ON vereinsfinanzen(category);
CREATE INDEX IF NOT EXISTS idx_vereinsmitglieder_category ON vereinsmitglieder(category);
CREATE INDEX IF NOT EXISTS idx_vereinsmitglieder_status ON vereinsmitglieder(status);
