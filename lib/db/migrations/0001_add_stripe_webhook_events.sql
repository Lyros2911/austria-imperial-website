-- Add stripe_webhook_events table for event-level idempotency
CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "stripe_event_id" varchar(100) NOT NULL,
  "event_type" varchar(100) NOT NULL,
  "processed_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stripe_webhook_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
