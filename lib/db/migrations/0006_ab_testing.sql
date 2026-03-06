-- A/B Testing: Avatar-Studie (KI-Avatar-Verkaufsstudie)
-- Migration 0006: Erstellt Experiment- und Event-Tabellen + AB-Spalten auf orders

-- Neue Enums
CREATE TYPE "public"."ab_experiment_status" AS ENUM('draft', 'running', 'paused', 'completed');
--> statement-breakpoint
CREATE TYPE "public"."ab_event_type" AS ENUM('page_view', 'avatar_impression', 'avatar_click', 'add_to_cart', 'checkout_start', 'purchase');
--> statement-breakpoint

-- Experiment-Konfiguration
CREATE TABLE "ab_experiments" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" varchar(50) NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text,
  "variant_a_name" varchar(100) DEFAULT 'with_avatar' NOT NULL,
  "variant_b_name" varchar(100) DEFAULT 'control' NOT NULL,
  "traffic_percent" integer DEFAULT 50 NOT NULL,
  "status" "ab_experiment_status" DEFAULT 'draft' NOT NULL,
  "started_at" timestamp,
  "ended_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ab_experiments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- Anonyme Tracking-Events (APPEND-ONLY, keine PII)
CREATE TABLE "ab_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "experiment_id" integer NOT NULL,
  "visitor_id" varchar(36) NOT NULL,
  "variant" varchar(20) NOT NULL,
  "event_type" "ab_event_type" NOT NULL,
  "product_slug" varchar(100),
  "locale" varchar(10),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Foreign Key: ab_events → ab_experiments
ALTER TABLE "ab_events" ADD CONSTRAINT "ab_events_experiment_id_ab_experiments_id_fk"
  FOREIGN KEY ("experiment_id") REFERENCES "public"."ab_experiments"("id")
  ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- AB-Variante auf bestehende orders-Tabelle (nullable, bestehende Daten = NULL)
ALTER TABLE "orders" ADD COLUMN "ab_variant" varchar(20);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ab_experiment_slug" varchar(50);
--> statement-breakpoint

-- Index fuer schnelle Funnel-Abfragen
CREATE INDEX "ab_events_experiment_variant_idx" ON "ab_events" ("experiment_id", "variant", "event_type");
--> statement-breakpoint
CREATE INDEX "ab_events_visitor_idx" ON "ab_events" ("visitor_id");
