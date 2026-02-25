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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// ENUMS
// ============================================================

export const productCategoryEnum = pgEnum('product_category', [
  'kernoel',
  'kren',
]);

export const producerEnum = pgEnum('producer', [
  'kiendler',
  'hernach',
]);

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

// ============================================================
// 1. PRODUCTS
// ============================================================

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  nameDe: varchar('name_de', { length: 200 }).notNull(),
  nameEn: varchar('name_en', { length: 200 }).notNull(),
  descriptionDe: text('description_de'),
  descriptionEn: text('description_en'),
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
// Bruttogewinn = revenue - producer_cost - packaging - shipping - payment_fee - customs
// Peter = 50% * Bruttogewinn
// AIGG = 50% * Bruttogewinn
//
// NICHT abziehbar vor Peters Anteil: Marketing, AURYX Retainer, Fixkosten, Hosting, Ads
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
  // Computed: 50% of grossProfit
  peterShareCents: integer('peter_share_cents').notNull(),
  // Computed: 50% of grossProfit
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// ============================================================
// RELATIONS
// ============================================================

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
