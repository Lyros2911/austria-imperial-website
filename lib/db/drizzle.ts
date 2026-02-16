import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle as drizzleServerless, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

function getPostgresUrl(): string {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }
  return url;
}

// ─── HTTP Driver ──────────────────────────────
// Fast for queries, no transaction support.
// Lazy-initialized to avoid build-time errors.

type HttpDb = NeonHttpDatabase<typeof schema>;
let _db: HttpDb | null = null;

function getDb(): HttpDb {
  if (!_db) {
    const sql = neon(getPostgresUrl());
    _db = drizzleHttp(sql, { schema });
  }
  return _db;
}

/**
 * HTTP-based Drizzle client (lazy-initialized).
 * Use for all read queries. Does NOT support transactions.
 */
export const db: HttpDb = new Proxy({} as HttpDb, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(real);
    }
    return value;
  },
});

// ─── Pool Driver ──────────────────────────────
// Supports real DB transactions (BEGIN/COMMIT/ROLLBACK).
// Used for create-order and refund operations that need atomicity.

type PoolDb = NeonDatabase<typeof schema>;
let _dbPool: PoolDb | null = null;

function getDbPool(): PoolDb {
  if (!_dbPool) {
    const pool = new Pool({ connectionString: getPostgresUrl() });
    _dbPool = drizzleServerless(pool, { schema });
  }
  return _dbPool;
}

/**
 * Pool-based Drizzle client (lazy-initialized).
 * Use for operations that need atomicity (transactions).
 */
export const dbPool: PoolDb = new Proxy({} as PoolDb, {
  get(_target, prop, receiver) {
    const real = getDbPool();
    const value = Reflect.get(real, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(real);
    }
    return value;
  },
});
