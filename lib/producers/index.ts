/**
 * Producer Registry — Austria Imperial Green Gold
 *
 * Zentraler Lookup: producer name → ProducerClient instance.
 *
 * ERWEITERBARKEIT:
 * Legacy producers (Kiendler, Hernach) have custom implementations.
 * New producers are loaded dynamically from the DB as GenericProducerClient.
 *
 * getProducer() is async — loads from DB with 5-min in-memory cache.
 */

import type { ProducerClient, ProducerConfig } from './types';
import { KiendlerClient } from './kiendler';
import { HernachClient } from './hernach';
import { GenericProducerClient } from './generic';
import { db } from '@/lib/db/drizzle';
import { producers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Legacy static registry — Kiendler and Hernach have custom implementations
const legacyRegistry = new Map<string, ProducerClient>([
  ['kiendler', new KiendlerClient()],
  ['hernach', new HernachClient()],
]);

// Dynamic cache for generic producers (TTL: 5 min)
const dynamicCache = new Map<string, { client: ProducerClient; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get the ProducerClient for a given producer name.
 *
 * 1. Check legacy registry (Kiendler, Hernach)
 * 2. Check in-memory cache
 * 3. Load from DB and create GenericProducerClient
 *
 * Throws if producer is unknown or inactive.
 */
export async function getProducer(name: string): Promise<ProducerClient> {
  // 1. Check legacy registry first
  const legacy = legacyRegistry.get(name);
  if (legacy) return legacy;

  // 2. Check dynamic cache
  const cached = dynamicCache.get(name);
  if (cached && cached.expiresAt > Date.now()) return cached.client;

  // 3. Load from DB
  const producer = await db.query.producers.findFirst({
    where: eq(producers.slug, name),
  });

  if (!producer || !producer.isActive) {
    throw new Error(`Unknown or inactive producer: "${name}"`);
  }

  const config: ProducerConfig = {
    slug: producer.slug,
    displayName: producer.displayName,
    contactEmail: producer.contactEmail,
    apiUrl: producer.apiUrl,
    apiKeyEncrypted: producer.apiKeyEncrypted,
    mode: producer.mode,
    airtableTableName: producer.airtableTableName,
  };

  const client = new GenericProducerClient(config);
  dynamicCache.set(name, { client, expiresAt: Date.now() + CACHE_TTL });
  return client;
}

/**
 * Get all active producer slugs (for dynamic dropdowns, Zod validation).
 */
export async function getAllProducerSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: producers.slug })
    .from(producers)
    .where(eq(producers.isActive, true));
  return rows.map((r) => r.slug);
}

/**
 * Get all active producers with display names (for UI).
 */
export async function getAllProducersWithNames(): Promise<
  Array<{
    slug: string;
    displayName: string;
    displayNameDe: string;
    displayNameEn: string;
    displayNameAr: string | null;
  }>
> {
  const rows = await db
    .select({
      slug: producers.slug,
      displayName: producers.displayName,
      displayNameDe: producers.displayNameDe,
      displayNameEn: producers.displayNameEn,
      displayNameAr: producers.displayNameAr,
    })
    .from(producers)
    .where(eq(producers.isActive, true));
  return rows;
}

/**
 * Legacy: sync function for backward compat (only returns legacy producers).
 */
export function getAllProducers(): ProducerClient[] {
  return Array.from(legacyRegistry.values());
}

// Re-export types
export type { ProducerClient, ProducerOrderPayload } from './types';
export { dispatchFulfillmentOrders, dispatchSingleFulfillment } from './dispatch';
