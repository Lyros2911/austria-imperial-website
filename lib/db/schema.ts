/**
 * Austria Imperial Green Gold – Complete Database Schema
 *
 * VERBINDLICHE REGELN:
 * 1. financial_ledger ist APPEND-ONLY. Keine Updates, keine Deletes.
 * 2. monthly_reports sind revisionssicher (SHA256-Hash).
 * 3. audit_log ist IMMUTABLE.
 * 4. Peter erhaelt 50% vom Bruttogewinn (berechnet in financial_ledger).
 * 5. Order Routing: Kiendler = Kernoel, Hernach = Kren.
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  pgEnum,
  decimal,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// ENUMS
// ============================================================

export const productCategoryEnum = pgEnum('product_category', [
  'kernoel',
  'kren',
  'tiernahrung',
]);

export const producerEnum = pgEnum('producer', [
  'kiendler',
  'hernach',
]);

export const producerModeEnum = pgEnum('producer_mode', ['api', 'email']);

// ============================================================
// PRODUCERS — Dynamische Produzenten-Verwaltung
//
// Einzelne Quelle der Wahrheit für alle Produzenten-Metadaten.
// slug MUSS mit dem PostgreSQL-Enum-Wert übereinstimmen.
// Neue Produzenten: ALTER TYPE producer ADD VALUE + INSERT hier.
// ============================================================

export const producers = pgTable('producers', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 200 }).notNull(),
  displayNameDe: varchar('display_name_de', { length: 200 }).notNull(),
  displayNameEn: varchar('display_name_en', { length: 200 }).notNull(),
  displayNameAr: varchar('display_name_ar', { length: 200 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  apiUrl: varchar('api_url', { length: 500 }),
  apiKeyEncrypted: text('api_key_encrypted'),
  mode: producerModeEnum('mode').notNull().default('email'),
  airtableTableName: varchar('airtable_table_name', { length: 200 }),
  logoUrl: text('logo_url'),
  descriptionDe: text('description_de'),
  descriptionEn: text('description_en'),
  descriptionAr: text('description_ar'),
  commissionPercent: decimal('commission_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'processing',
  'partially_shipped',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'pending',
  'sent_to_producer',
  'confirmed',
  'shipped',
  'delivered',
  'failed',
  'cancelled',
]);

export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type', [
  'sale',
  'partial_refund',
  'full_refund',
  'adjustment',
]);

export const reportStatusEnum = pgEnum('report_status', [
  'generated',
  'archived',
]);

export const addressTypeEnum = pgEnum('address_type', [
  'shipping',
  'billing',
]);

export const commissionStatusEnum = pgEnum('commission_status', [
  'pending',
  'paid',
  'waived',
]);

// ============================================================
// 1. PRODUCTS
// ============================================================

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  nameDe: varchar('name_de', { length: 200 }).notNull(),
  nameEn: varchar('name_en', { length: 200 }).notNull(),
  nameAr: varchar('name_ar', { length: 200 }),
  descriptionDe: text('description_de'),
  descriptionEn: text('description_en'),
  descriptionAr: text('description_ar'),
  category: productCategoryEnum('category').notNull(),
  producer: producerEnum('producer').notNull(),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================
// 2. PRODUCT VARIANTS
// ============================================================

export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  sku: varchar('sku', { length: 50 }).notNull().unique(),
  nameDe: varchar('name_de', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }).notNull(),
  sizeMl: integer('size_ml'),
  priceCents: integer('price_cents').notNull(),
  stripePriceId: varchar('stripe_price_id', { length: 100 }),
  weightGrams: integer('weight_grams'),
  stockStatus: varchar('stock_status', { length: 20 })
    .notNull()
    .default('in_stock'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================
// 3. CUSTOMERS (optional accounts — password_hash nullable for guests)
// ============================================================

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'), // NULL for guest-only customers
  name: varchar('name', { length: 200 }),
  phone: varchar('phone', { length: 50 }),
  locale: varchar('locale', { length: 10 }).notNull().default('de'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'), // soft delete
});

// ============================================================
// 4. CUSTOMER ADDRESSES
// ============================================================

export const customerAddresses = pgTable('customer_addresses', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),
  type: addressTypeEnum('type').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  name: varchar('name', { length: 200 }).notNull(),
  street: varchar('street', { length: 300 }).notNull(),
  street2: varchar('street2', { length: 300 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }).notNull(),
  country: varchar('country', { length: 2 }).notNull(), // ISO 3166-1 alpha-2
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================
// 5. ORDERS
// ============================================================

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id), // nullable for guest
  guestEmail: varchar('guest_email', { length: 255 }),
  status: orderStatusEnum('status').notNull().default('pending'),

  // Shipping address (denormalized snapshot at order time)
  shippingName: varchar('shipping_name', { length: 200 }),
  shippingStreet: varchar('shipping_street', { length: 300 }),
  shippingStreet2: varchar('shipping_street2', { length: 300 }),
  shippingCity: varchar('shipping_city', { length: 100 }),
  shippingState: varchar('shipping_state', { length: 100 }),
  shippingPostalCode: varchar('shipping_postal_code', { length: 20 }),
  shippingCountry: varchar('shipping_country', { length: 2 }),

  // Billing address
  billingName: varchar('billing_name', { length: 200 }),
  billingStreet: varchar('billing_street', { length: 300 }),
  billingCity: varchar('billing_city', { length: 100 }),
  billingPostalCode: varchar('billing_postal_code', { length: 20 }),
  billingCountry: varchar('billing_country', { length: 2 }),

  // Stripe
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 200 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 200 }),

  // Totals (all in EUR cents)
  subtotalCents: integer('subtotal_cents').notNull(),
  shippingCents: integer('shipping_cents').notNull().default(0),
  taxCents: integer('tax_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),

  locale: varchar('locale', { length: 10 }).notNull().default('de'),
  notes: text('notes'),

  // Attribution tracking — woher kam die Bestellung?
  attributionSource: varchar('attribution_source', { length: 50 }).default('direct'),
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  utmContent: varchar('utm_content', { length: 255 }),
  referrerUrl: varchar('referrer_url', { length: 500 }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================
// 6. ORDER ITEMS
// ============================================================

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  productVariantId: integer('product_variant_id')
    .notNull()
    .references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(), // snapshot at purchase time
  totalCents: integer('total_cents').notNull(),
  producer: producerEnum('producer').notNull(), // denormalized for routing
});

// ============================================================
// 7. FULFILLMENT ORDERS (one per producer per order)
// ============================================================

export const fulfillmentOrders = pgTable('fulfillment_orders', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  producer: producerEnum('producer').notNull(),
  status: fulfillmentStatusEnum('status').notNull().default('pending'),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  trackingUrl: text('tracking_url'),
  externalOrderId: varchar('external_order_id', { length: 100 }),
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
  sentAt: timestamp('sent_at'),
  confirmedAt: timestamp('confirmed_at'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================
// 8. FULFILLMENT EVENTS (event log per fulfillment order)
// ============================================================

export const fulfillmentEvents = pgTable('fulfillment_events', {
  id: serial('id').primaryKey(),
  fulfillmentOrderId: integer('fulfillment_order_id')
    .notNull()
    .references(() => fulfillmentOrders.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================
// 9. FINANCIAL LEDGER (APPEND-ONLY — PFLICHT)
//
// Reporting basiert AUSSCHLIESSLICH auf dieser Tabelle.
// Keine Updates, keine Deletes. Nur INSERT.
//
// Revenue-Waterfall (Strukturvereinbarung 26.02.2026):
//   Bruttogewinn = revenue - producer_cost - packaging - shipping - payment_fee - customs
//   Auryx AI = 10% vom D2C-Nettoumsatz (revenue - payment_fee)
//   Restgewinn = Bruttogewinn - Auryx-Anteil
//   Peter = 50% vom Restgewinn
//   Gottfried (AIGG) = 50% vom Restgewinn
//
// NICHT abziehbar vor der Gewinnverteilung: Marketing, Fixkosten, Hosting, Ads
// ============================================================

export const financialLedger = pgTable('financial_ledger', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  entryType: ledgerEntryTypeEnum('entry_type').notNull(),

  // All amounts in EUR cents
  revenueCents: integer('revenue_cents').notNull(),
  producerCostCents: integer('producer_cost_cents').notNull(),
  packagingCents: integer('packaging_cents').notNull().default(0),
  shippingCostCents: integer('shipping_cost_cents').notNull().default(0),
  paymentFeeCents: integer('payment_fee_cents').notNull(),
  customsCents: integer('customs_cents').notNull().default(0),

  // Computed: revenue - all costs
  grossProfitCents: integer('gross_profit_cents').notNull(),
  // Computed: 10% of D2C net revenue (revenue - payment_fee) — Auryx Technologiepartner
  auryxShareCents: integer('auryx_share_cents').notNull().default(0),
  // Computed: 50% of (grossProfit - auryxShare)
  peterShareCents: integer('peter_share_cents').notNull(),
  // Computed: 50% of (grossProfit - auryxShare) — Gottfrieds Anteil
  aiggShareCents: integer('aigg_share_cents').notNull(),

  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================
// 10. AUDIT LOG (IMMUTABLE — never update or delete)
// ============================================================

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  performedBy: varchar('performed_by', { length: 100 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================
// 11. MONTHLY REPORTS (revisionssicher, SHA256-Hash)
//
// Basiert AUSSCHLIESSLICH auf financial_ledger.
// PDF darf NIEMALS ueberschrieben werden.
// Bei Neugenerierung: alter Report → status = 'archived'.
// ============================================================

export const monthlyReports = pgTable('monthly_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Aggregated from financial_ledger (all in EUR cents)
  totalRevenueCents: integer('total_revenue_cents').notNull(),
  totalProducerCostCents: integer('total_producer_cost_cents').notNull(),
  totalShippingCostCents: integer('total_shipping_cost_cents').notNull(),
  totalPaymentFeeCents: integer('total_payment_fee_cents').notNull(),
  totalGrossProfitCents: integer('total_gross_profit_cents').notNull(),
  totalAuryxCents: integer('total_auryx_cents').notNull().default(0),
  totalPeterCents: integer('total_peter_cents').notNull(),
  totalAiggCents: integer('total_aigg_cents').notNull(),

  ledgerEntriesCount: integer('ledger_entries_count').notNull(),

  // Integrity
  reportHash: varchar('report_hash', { length: 64 }).notNull(), // SHA256
  pdfPath: text('pdf_path'),
  csvPath: text('csv_path'),

  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  generatedBy: varchar('generated_by', { length: 100 }).notNull().default('system'),
  status: reportStatusEnum('status').notNull().default('generated'),
});

// ============================================================
// 12. STRIPE WEBHOOK EVENTS (Idempotenz-Garantie)
//
// Speichert jede verarbeitete Stripe Event-ID.
// Verhindert doppelte Verarbeitung selbst bei Retry.
// ============================================================

export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: serial('id').primaryKey(),
  stripeEventId: varchar('stripe_event_id', { length: 100 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
});

// ============================================================
// 13. ADMIN USERS
// ============================================================

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 100 }),
  role: varchar('role', { length: 20 }).notNull().default('admin'),
  producer: producerEnum('producer'), // NULL = kein Producer (admin/viewer), 'kiendler' oder 'hernach'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// ============================================================
// 14. PARTNER CONFIG (Auryx Revenue Share)
//
// Jeder Auryx-Kunde = 1 Partner-Config.
// AIGG: commission_percent = 10 (Auryx = Technologiepartner, 10% D2C-Nettoumsatz).
// Zukuenftige Kunden: commission_percent = 10 (10% auf Content-attributed Umsatz).
// ============================================================

export const partnerConfig = pgTable('partner_config', {
  id: serial('id').primaryKey(),
  partnerCode: varchar('partner_code', { length: 50 }).notNull().unique(),
  partnerName: varchar('partner_name', { length: 200 }).notNull(),
  commissionPercent: decimal('commission_percent', { precision: 5, scale: 2 }).notNull().default('10.00'),
  stripeConnectedAccountId: varchar('stripe_connected_account_id', { length: 100 }),
  isPlatformOwner: boolean('is_platform_owner').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================
// 15. PARTNER COMMISSIONS (Revenue Share pro Bestellung)
//
// APPEND-ONLY analog zu financial_ledger.
// Status: pending → paid (via Stripe Connect Transfer) oder waived (nur explizit befreite Partner).
// ============================================================

export const partnerCommissions = pgTable('partner_commissions', {
  id: serial('id').primaryKey(),
  partnerConfigId: integer('partner_config_id')
    .notNull()
    .references(() => partnerConfig.id),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  orderNumber: varchar('order_number', { length: 30 }).notNull(),
  orderTotalCents: integer('order_total_cents').notNull(),
  commissionPercent: decimal('commission_percent', { precision: 5, scale: 2 }).notNull(),
  commissionCents: integer('commission_cents').notNull(),
  attributionSource: varchar('attribution_source', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  status: commissionStatusEnum('status').notNull().default('pending'),
  stripeTransferId: varchar('stripe_transfer_id', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  paidAt: timestamp('paid_at'),
  notes: text('notes'),
});

// ============================================================
// 16. PARTNER USERS (Saudi-Partner-Portal)
//
// Eigene Tabelle, getrennt von admin_users.
// Jeder Partner-User gehoert zu genau einer partner_config.
// ============================================================

export const partnerUsers = pgTable('partner_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 200 }),
  companyName: varchar('company_name', { length: 200 }),
  partnerConfigId: integer('partner_config_id')
    .notNull()
    .references(() => partnerConfig.id),
  locale: varchar('locale', { length: 10 }).notNull().default('ar'),
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// ============================================================
// 17. PARTNER DOCUMENTS (Zollpapiere, Zertifikate, Rechnungen)
//
// Hochgeladen vom Admin, sichtbar im Partner-Portal.
// Dateien werden im Volume /data/partner-docs gespeichert.
// ============================================================

export const documentCategoryEnum = pgEnum('document_category', [
  'customs',
  'certificate',
  'invoice',
  'contract',
  'other',
]);

export const partnerDocuments = pgTable('partner_documents', {
  id: serial('id').primaryKey(),
  partnerConfigId: integer('partner_config_id')
    .notNull()
    .references(() => partnerConfig.id),
  title: varchar('title', { length: 300 }).notNull(),
  category: documentCategoryEnum('category').notNull().default('other'),
  fileName: varchar('file_name', { length: 300 }).notNull(),
  fileSize: integer('file_size'), // bytes
  mimeType: varchar('mime_type', { length: 100 }),
  storagePath: text('storage_path').notNull(), // internal path or S3 key
  uploadedBy: varchar('uploaded_by', { length: 200 }).notNull(), // admin email
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================
// 18. PARTNER PRICE LISTS (B2B-Exportpreise)
//
// Jeder Eintrag = 1 Produkt-Variante mit B2B-Preis für 1 Partner.
// ============================================================

export const partnerPriceLists = pgTable('partner_price_lists', {
  id: serial('id').primaryKey(),
  partnerConfigId: integer('partner_config_id')
    .notNull()
    .references(() => partnerConfig.id),
  productVariantId: integer('product_variant_id')
    .notNull()
    .references(() => productVariants.id),
  exportPriceCents: integer('export_price_cents').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  minOrderQuantity: integer('min_order_quantity').notNull().default(1),
  validFrom: timestamp('valid_from').notNull().defaultNow(),
  validUntil: timestamp('valid_until'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================
// 19. PARTNER MESSAGES (Partner ↔ AIGG Kommunikation)
//
// Einfaches Nachrichtensystem zwischen Partner und AIGG-Admin.
// ============================================================

export const messageSenderTypeEnum = pgEnum('message_sender_type', ['partner', 'admin']);

export const partnerMessages = pgTable('partner_messages', {
  id: serial('id').primaryKey(),
  partnerConfigId: integer('partner_config_id')
    .notNull()
    .references(() => partnerConfig.id),
  senderType: messageSenderTypeEnum('sender_type').notNull(),
  senderName: varchar('sender_name', { length: 200 }).notNull(),
  subject: varchar('subject', { length: 300 }),
  body: text('body').notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================
// 20. PARTNER ORDERS (B2B-Bestellungen)
//
// B2B-Bestellungen direkt vom Partner (nicht über Shop).
// Status-Workflow: draft → submitted → confirmed → shipped → delivered
// ============================================================

export const partnerOrderStatusEnum = pgEnum('partner_order_status', [
  'draft',
  'submitted',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

export const partnerOrders = pgTable('partner_orders', {
  id: serial('id').primaryKey(),
  partnerConfigId: integer('partner_config_id')
    .notNull()
    .references(() => partnerConfig.id),
  orderNumber: varchar('order_number', { length: 30 }).notNull().unique(),
  status: partnerOrderStatusEnum('status').notNull().default('draft'),
  totalCents: integer('total_cents').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
  notes: text('notes'),
  submittedBy: varchar('submitted_by', { length: 200 }), // partner user email
  confirmedBy: varchar('confirmed_by', { length: 200 }), // admin email
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  submittedAt: timestamp('submitted_at'),
  confirmedAt: timestamp('confirmed_at'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
});

export const partnerOrderItems = pgTable('partner_order_items', {
  id: serial('id').primaryKey(),
  partnerOrderId: integer('partner_order_id')
    .notNull()
    .references(() => partnerOrders.id),
  productVariantId: integer('product_variant_id')
    .notNull()
    .references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  totalCents: integer('total_cents').notNull(),
});

// ============================================================
// RELATIONS
// ============================================================

export const producersRelations = relations(producers, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  addresses: many(customerAddresses),
  orders: many(orders),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  customer: one(customers, {
    fields: [customerAddresses.customerId],
    references: [customers.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
  fulfillmentOrders: many(fulfillmentOrders),
  ledgerEntries: many(financialLedger),
  commissions: many(partnerCommissions),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  productVariant: one(productVariants, {
    fields: [orderItems.productVariantId],
    references: [productVariants.id],
  }),
}));

export const fulfillmentOrdersRelations = relations(fulfillmentOrders, ({ one, many }) => ({
  order: one(orders, {
    fields: [fulfillmentOrders.orderId],
    references: [orders.id],
  }),
  events: many(fulfillmentEvents),
}));

export const fulfillmentEventsRelations = relations(fulfillmentEvents, ({ one }) => ({
  fulfillmentOrder: one(fulfillmentOrders, {
    fields: [fulfillmentEvents.fulfillmentOrderId],
    references: [fulfillmentOrders.id],
  }),
}));

export const financialLedgerRelations = relations(financialLedger, ({ one }) => ({
  order: one(orders, {
    fields: [financialLedger.orderId],
    references: [orders.id],
  }),
}));

export const partnerConfigRelations = relations(partnerConfig, ({ many }) => ({
  commissions: many(partnerCommissions),
  users: many(partnerUsers),
  documents: many(partnerDocuments),
  priceLists: many(partnerPriceLists),
  messages: many(partnerMessages),
  partnerOrders: many(partnerOrders),
}));

export const partnerUsersRelations = relations(partnerUsers, ({ one }) => ({
  partner: one(partnerConfig, {
    fields: [partnerUsers.partnerConfigId],
    references: [partnerConfig.id],
  }),
}));

export const partnerCommissionsRelations = relations(partnerCommissions, ({ one }) => ({
  partner: one(partnerConfig, {
    fields: [partnerCommissions.partnerConfigId],
    references: [partnerConfig.id],
  }),
  order: one(orders, {
    fields: [partnerCommissions.orderId],
    references: [orders.id],
  }),
}));

export const partnerDocumentsRelations = relations(partnerDocuments, ({ one }) => ({
  partner: one(partnerConfig, {
    fields: [partnerDocuments.partnerConfigId],
    references: [partnerConfig.id],
  }),
}));

export const partnerPriceListsRelations = relations(partnerPriceLists, ({ one }) => ({
  partner: one(partnerConfig, {
    fields: [partnerPriceLists.partnerConfigId],
    references: [partnerConfig.id],
  }),
  productVariant: one(productVariants, {
    fields: [partnerPriceLists.productVariantId],
    references: [productVariants.id],
  }),
}));

export const partnerMessagesRelations = relations(partnerMessages, ({ one }) => ({
  partner: one(partnerConfig, {
    fields: [partnerMessages.partnerConfigId],
    references: [partnerConfig.id],
  }),
}));

export const partnerOrdersRelations = relations(partnerOrders, ({ one, many }) => ({
  partner: one(partnerConfig, {
    fields: [partnerOrders.partnerConfigId],
    references: [partnerConfig.id],
  }),
  items: many(partnerOrderItems),
}));

export const partnerOrderItemsRelations = relations(partnerOrderItems, ({ one }) => ({
  partnerOrder: one(partnerOrders, {
    fields: [partnerOrderItems.partnerOrderId],
    references: [partnerOrders.id],
  }),
  productVariant: one(productVariants, {
    fields: [partnerOrderItems.productVariantId],
    references: [productVariants.id],
  }),
}));

// ============================================================
// VEREIN: STUDIENBERICHTE
// Automatisch generierte Forschungsberichte (Wochen/Monats/Quartalsberichte)
// Erzeugt von n8n-Workflows, gelesen vom Admin-Dashboard
// ============================================================

export const studyReportTypeEnum = pgEnum('study_report_type', [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
]);

export const studyReportStatusEnum = pgEnum('study_report_status', [
  'draft',
  'final',
  'published',
]);

export const studyReports = pgTable('study_reports', {
  id: serial('id').primaryKey(),
  reportId: varchar('report_id', { length: 30 }).notNull().unique(), // WB-2026-W10, MB-2026-03, QB-2026-Q1
  type: studyReportTypeEnum('type').notNull(),
  periodFrom: timestamp('period_from').notNull(),
  periodTo: timestamp('period_to').notNull(),
  // Kennzahlen
  totalRevenue: integer('total_revenue'), // in Cent
  orderCount: integer('order_count'),
  averageOrderValue: integer('average_order_value'), // in Cent
  topContent: text('top_content'), // Best-performender Content
  // Content
  aiSummary: text('ai_summary'), // Claude-generierte Zusammenfassung
  pdfUrl: text('pdf_url'), // Link zum PDF in GCS (gs://aigg-reports/...)
  // Aufschlüsselung
  dataByLanguage: jsonb('data_by_language'), // { de: {...}, en: {...}, ar: {...} }
  dataByMarket: jsonb('data_by_market'), // { dach: {...}, english: {...}, arabic: {...} }
  contentMetrics: jsonb('content_metrics'), // Array von Content-Performance-Daten
  // Meta
  status: studyReportStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
});

// ============================================================
// VEREIN: VEREINSFINANZEN
// Interne Finanztransaktionen des Vereins (Obmann + Kassier)
// 1.000-€-Grenze für Einzelzeichnung, darüber Gegenzeichnung nötig
// ============================================================

export const transactionCategoryEnum = pgEnum('transaction_category', [
  'produkte',
  'reisen',
  'equipment',
  'dienstleistungen',
  'auryx_rechnung',
  'marketing',
  'sonstiges',
]);

export const boardMemberEnum = pgEnum('board_member', [
  'gottfried',
  'peter',
]);

export const paymentMethodEnum = pgEnum('payment_method_verein', [
  'karte_gottfried',
  'karte_peter',
  'ueberweisung',
  'bar',
]);

export const vereinsfinanzen = pgTable('vereinsfinanzen', {
  id: serial('id').primaryKey(),
  transactionId: varchar('transaction_id', { length: 30 }).notNull().unique(), // TXN-2026-0042
  date: timestamp('date').notNull(),
  amount: integer('amount').notNull(), // in Cent, positiv = Einnahme, negativ = Ausgabe
  category: transactionCategoryEnum('category').notNull(),
  description: text('description').notNull(), // Zweck der Transaktion
  executedBy: boardMemberEnum('executed_by').notNull(), // Wer hat die Ausgabe getätigt
  isOver1000: boolean('is_over_1000').notNull().default(false), // Auto: |amount| > 100000 Cent
  // Gegenzeichnung (nur bei > 1.000 €)
  countersignedBy: boardMemberEnum('countersigned_by'), // Wer hat freigegeben
  countersignedAt: timestamp('countersigned_at'),
  countersignatureRequired: boolean('countersignature_required').notNull().default(false),
  // Belege
  receiptUrl: text('receipt_url'), // Link zum Beleg (GCS/Upload)
  receiptReference: varchar('receipt_reference', { length: 100 }), // Belegnummer
  paymentMethod: paymentMethodEnum('payment_method'),
  // Meta
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdByAdminId: integer('created_by_admin_id').references(() => adminUsers.id),
});

// ============================================================
// VEREIN: MITGLIEDER
// Vereinsmitglieder nach VerG 2002
// Ordentlich (Stimmrecht), Förder (kein Stimmrecht),
// Außerordentlich (Kooperationspartner), Ehrenmitglied
// ============================================================

export const memberCategoryEnum = pgEnum('member_category', [
  'ordentlich',
  'foerder',
  'ausserordentlich',
  'ehren',
]);

export const memberStatusEnum = pgEnum('member_status', [
  'aktiv',
  'ehemalig',
]);

export const vereinsmitglieder = pgTable('vereinsmitglieder', {
  id: serial('id').primaryKey(),
  memberNumber: varchar('member_number', { length: 20 }).notNull().unique(), // M-001
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  category: memberCategoryEnum('category').notNull(),
  joinDate: timestamp('join_date').notNull(),
  status: memberStatusEnum('status').notNull().default('aktiv'),
  // DSGVO
  gdprConsentDate: timestamp('gdpr_consent_date'),
  dataOrigin: varchar('data_origin', { length: 255 }), // z.B. "Gründungsmitglied"
  // Meta
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type FulfillmentOrder = typeof fulfillmentOrders.$inferSelect;
export type NewFulfillmentOrder = typeof fulfillmentOrders.$inferInsert;
export type FinancialLedgerEntry = typeof financialLedger.$inferSelect;
export type NewFinancialLedgerEntry = typeof financialLedger.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type MonthlyReport = typeof monthlyReports.$inferSelect;
export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type PartnerConfig = typeof partnerConfig.$inferSelect;
export type NewPartnerConfig = typeof partnerConfig.$inferInsert;
export type PartnerCommission = typeof partnerCommissions.$inferSelect;
export type NewPartnerCommission = typeof partnerCommissions.$inferInsert;
export type PartnerUser = typeof partnerUsers.$inferSelect;
export type NewPartnerUser = typeof partnerUsers.$inferInsert;
export type PartnerDocument = typeof partnerDocuments.$inferSelect;
export type NewPartnerDocument = typeof partnerDocuments.$inferInsert;
export type PartnerPriceList = typeof partnerPriceLists.$inferSelect;
export type NewPartnerPriceList = typeof partnerPriceLists.$inferInsert;
export type PartnerMessage = typeof partnerMessages.$inferSelect;
export type NewPartnerMessage = typeof partnerMessages.$inferInsert;
export type PartnerOrder = typeof partnerOrders.$inferSelect;
export type NewPartnerOrder = typeof partnerOrders.$inferInsert;
export type PartnerOrderItem = typeof partnerOrderItems.$inferSelect;
export type NewPartnerOrderItem = typeof partnerOrderItems.$inferInsert;
export type Producer = typeof producers.$inferSelect;
export type NewProducer = typeof producers.$inferInsert;
export type StudyReport = typeof studyReports.$inferSelect;
export type NewStudyReport = typeof studyReports.$inferInsert;
export type Vereinsfinanz = typeof vereinsfinanzen.$inferSelect;
export type NewVereinsfinanz = typeof vereinsfinanzen.$inferInsert;
export type Vereinsmitglied = typeof vereinsmitglieder.$inferSelect;
export type NewVereinsmitglied = typeof vereinsmitglieder.$inferInsert;
