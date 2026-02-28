/**
 * Admin Authentication — Austria Imperial Green Gold
 *
 * Komplett getrennt von Customer Auth.
 * JWT in httpOnly Cookie, 24h Laufzeit.
 * Rollen: 'admin' (voller Zugriff) | 'viewer' (nur lesen).
 */

import { SignJWT, jwtVerify } from 'jose';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/drizzle';
import { adminUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const COOKIE_NAME = 'aigg-admin-session';
const JWT_EXPIRES = '24h';

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET environment variable is not set');
  return new TextEncoder().encode(secret);
}

// ─── JWT ───────────────────────────────────────

export interface AdminPayload {
  userId: number;
  email: string;
  role: string;
  name: string | null;
  producer: string | null; // 'kiendler' | 'hernach' | null
}

export async function createAdminToken(payload: AdminPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

// ─── Session ───────────────────────────────────

export async function getAdminSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function setAdminSession(payload: AdminPayload): Promise<void> {
  const token = await createAdminToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─── Login ─────────────────────────────────────

export async function adminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email),
  });

  if (!admin || admin.deletedAt) {
    return { success: false, error: 'Ungültige Anmeldedaten' };
  }

  const valid = await compare(password, admin.passwordHash);
  if (!valid) {
    return { success: false, error: 'Ungültige Anmeldedaten' };
  }

  await setAdminSession({
    userId: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
    producer: admin.producer ?? null,
  });

  return { success: true };
}

// ─── Role Helpers ─────────────────────────────

export type AdminRole = 'admin' | 'viewer' | 'producer';

/**
 * Prüft ob der aktuelle User admin-Rechte hat (Schreibzugriff).
 * Gibt die Session zurück wenn admin, sonst null.
 */
export async function requireAdmin(): Promise<AdminPayload | null> {
  const session = await getAdminSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

// ─── Admin Seed Helper ─────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}
