/**
 * Airtable HTTP Client — Austria Imperial Green Gold
 *
 * Lightweight fetch-based client. No npm dependency needed.
 * All methods return result objects and NEVER throw.
 * Built-in retry for 429 (rate limit) with exponential backoff.
 */

import { AIRTABLE_API, getAirtablePat, getAirtableBaseId } from './config';

// ============================================================
// TYPES
// ============================================================

export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  fields: T;
  createdTime?: string;
}

export interface AirtableResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AirtableListResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 250;

async function airtableFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<AirtableResult<T>> {
  const pat = getAirtablePat();
  if (!pat) {
    return { success: false, error: 'AIRTABLE_PAT not set' };
  }

  const url = `${AIRTABLE_API}/${getAirtableBaseId()}/${encodeURIComponent(path)}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${pat}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Rate limit → retry with backoff
      if (res.status === 429 && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        return { success: false, error: `HTTP ${res.status}: ${body}` };
      }

      const data = (await res.json()) as T;
      return { success: true, data };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      const msg = err instanceof Error ? err.message : 'Unknown fetch error';
      return { success: false, error: msg };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Find a single record by Airtable formula.
 * Example formula: `{Bestellnummer} = "AIGG-20260225-9HDG"`
 */
export async function findRecord<T = Record<string, unknown>>(
  table: string,
  formula: string,
): Promise<AirtableResult<AirtableRecord<T> | null>> {
  const params = new URLSearchParams({
    filterByFormula: formula,
    maxRecords: '1',
  });

  const result = await airtableFetch<AirtableListResponse<T>>(
    `${table}?${params.toString()}`,
  );

  if (!result.success) return { success: false, error: result.error };

  const record = result.data?.records?.[0] ?? null;
  return { success: true, data: record };
}

/**
 * Create a single record. Uses typecast=true so Airtable auto-creates
 * select options and coerces values.
 */
export async function createRecord<T = Record<string, unknown>>(
  table: string,
  fields: Partial<T>,
): Promise<AirtableResult<AirtableRecord<T>>> {
  return airtableFetch<AirtableRecord<T>>(table, {
    method: 'POST',
    body: JSON.stringify({ fields, typecast: true }),
  });
}

/**
 * Update (PATCH) a single record by Airtable record ID.
 */
export async function updateRecord<T = Record<string, unknown>>(
  table: string,
  recordId: string,
  fields: Partial<T>,
): Promise<AirtableResult<AirtableRecord<T>>> {
  return airtableFetch<AirtableRecord<T>>(`${table}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields, typecast: true }),
  });
}

/**
 * Upsert: Find by formula, update if exists, create if not.
 * Returns the Airtable record ID (new or existing).
 */
export async function upsertByFormula<T = Record<string, unknown>>(
  table: string,
  formula: string,
  fields: Partial<T>,
): Promise<AirtableResult<AirtableRecord<T>>> {
  // Step 1: Try to find existing
  const existing = await findRecord<T>(table, formula);

  if (existing.success && existing.data) {
    // Step 2a: Update existing record
    return updateRecord<T>(table, existing.data.id, fields);
  }

  // Step 2b: Create new record
  return createRecord<T>(table, fields);
}
