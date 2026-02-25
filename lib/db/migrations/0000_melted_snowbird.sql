CREATE TYPE "public"."address_type" AS ENUM('shipping', 'billing');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('pending', 'sent_to_producer', 'confirmed', 'shipped', 'delivered', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('sale', 'partial_refund', 'full_refund', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'processing', 'partially_shipped', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."producer" AS ENUM('kiendler', 'hernach');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('kernoel', 'kren');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('generated', 'archived');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(100),
	"role" varchar(20) DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"performed_by" varchar(100),
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"type" "address_type" NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"name" varchar(200) NOT NULL,
	"street" varchar(300) NOT NULL,
	"street2" varchar(300),
	"city" varchar(100) NOT NULL,
	"state" varchar(100),
	"postal_code" varchar(20) NOT NULL,
	"country" varchar(2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"name" varchar(200),
	"phone" varchar(50),
	"locale" varchar(10) DEFAULT 'de' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "financial_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"entry_type" "ledger_entry_type" NOT NULL,
	"revenue_cents" integer NOT NULL,
	"producer_cost_cents" integer NOT NULL,
	"packaging_cents" integer DEFAULT 0 NOT NULL,
	"shipping_cost_cents" integer DEFAULT 0 NOT NULL,
	"payment_fee_cents" integer NOT NULL,
	"customs_cents" integer DEFAULT 0 NOT NULL,
	"gross_profit_cents" integer NOT NULL,
	"peter_share_cents" integer NOT NULL,
	"aigg_share_cents" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfillment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"fulfillment_order_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfillment_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"producer" "producer" NOT NULL,
	"status" "fulfillment_status" DEFAULT 'pending' NOT NULL,
	"tracking_number" varchar(100),
	"tracking_url" text,
	"external_order_id" varchar(100),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp,
	"confirmed_at" timestamp,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_revenue_cents" integer NOT NULL,
	"total_producer_cost_cents" integer NOT NULL,
	"total_shipping_cost_cents" integer NOT NULL,
	"total_payment_fee_cents" integer NOT NULL,
	"total_gross_profit_cents" integer NOT NULL,
	"total_peter_cents" integer NOT NULL,
	"total_aigg_cents" integer NOT NULL,
	"ledger_entries_count" integer NOT NULL,
	"report_hash" varchar(64) NOT NULL,
	"pdf_path" text,
	"csv_path" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by" varchar(100) DEFAULT 'system' NOT NULL,
	"status" "report_status" DEFAULT 'generated' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_variant_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"producer" "producer" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" varchar(20) NOT NULL,
	"customer_id" integer,
	"guest_email" varchar(255),
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"shipping_name" varchar(200),
	"shipping_street" varchar(300),
	"shipping_street2" varchar(300),
	"shipping_city" varchar(100),
	"shipping_state" varchar(100),
	"shipping_postal_code" varchar(20),
	"shipping_country" varchar(2),
	"billing_name" varchar(200),
	"billing_street" varchar(300),
	"billing_city" varchar(100),
	"billing_postal_code" varchar(20),
	"billing_country" varchar(2),
	"stripe_checkout_session_id" varchar(200),
	"stripe_payment_intent_id" varchar(200),
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"locale" varchar(10) DEFAULT 'de' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sku" varchar(50) NOT NULL,
	"name_de" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"size_ml" integer,
	"price_cents" integer NOT NULL,
	"stripe_price_id" varchar(100),
	"weight_grams" integer,
	"stock_status" varchar(20) DEFAULT 'in_stock' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name_de" varchar(200) NOT NULL,
	"name_en" varchar(200) NOT NULL,
	"description_de" text,
	"description_en" text,
	"category" "product_category" NOT NULL,
	"producer" "producer" NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_fulfillment_order_id_fulfillment_orders_id_fk" FOREIGN KEY ("fulfillment_order_id") REFERENCES "public"."fulfillment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_orders" ADD CONSTRAINT "fulfillment_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;