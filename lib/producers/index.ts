/**
 * Producer Registry — Austria Imperial Green Gold
 *
 * Zentraler Lookup: producer name → ProducerClient instance.
 *
 * ERWEITERBARKEIT:
 * Neuer Produzent?
 * 1. lib/producers/<name>.ts erstellen (implements ProducerClient)
 * 2. Hier registrieren
 * 3. producer enum in schema.ts erweitern
 * → Kein Core-System-Umbau nötig.
 */

import type { ProducerClient, ProducerName } from './types';
import { KiendlerClient } from './kiendler';
import { HernachClient } from './hernach';

const kiendler = new KiendlerClient();
const hernach = new HernachClient();

const registry: Record<ProducerName, ProducerClient> = {
  kiendler,
  hernach,
};

/**
 * Get the ProducerClient for a given producer name.
 * Throws if producer is unknown (data integrity issue).
 */
export function getProducer(name: ProducerName): ProducerClient {
  const client = registry[name];
  if (!client) {
    throw new Error(`Unknown producer: "${name}". Register in lib/producers/index.ts`);
  }
  return client;
}

/**
 * List all registered producers.
 */
export function getAllProducers(): ProducerClient[] {
  return Object.values(registry);
}

// Re-export types
export type { ProducerClient, ProducerName, ProducerOrderPayload } from './types';
export { dispatchFulfillmentOrders, dispatchSingleFulfillment } from './dispatch';
