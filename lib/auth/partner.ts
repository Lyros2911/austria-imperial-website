/**
 * Partner Authentication — Austria Imperial Green Gold
 *
 * Komplett getrennt von Admin Auth.
 * Eigener JWT-Cookie, eigene Tabelle (partner_users).
 * Für Saudi-Partner und zukünftige Import-Partner.
 */

import { SignJWT, jwtVerify } from 'jose';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/drizzle';
import { partnerUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const COOKIE_NAME = 'aigg-partner-session';
const JWT_EXPIRES = '24h';

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET environment variable is not set');
  return new TextEncoder().encode(secret);
}

// ─── JWT ───────────────────────────────────────

export interface PartnerPayload {
  userId: number;
  email: string;
  name: string | null;
  companyName: string | null;
  partnerConfigId: number;
}

export async function createPartnerToken(payload: PartnerPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .sign(getSecret());
}

export async function verifyPartnerToken(token: string): Promise<PartnerPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as PartnerPayload;
  } catch {
    return null;
  }
}

// ─── Session ───────────────────────────────────

export async function getPartnerSession(): Promise<PartnerPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyPartnerToken(token);
}

export async function setPartnerSession(payload: PartnerPayload): Promise<void> {
  const token = await createPartnerToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearPartnerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─── Login ─────────────────────────────────────

export async function partnerLogin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const partner = await db.query.partnerUsers.findFirst({
    where: eq(partnerUsers.email, email),
  });

  if (!partner || partner.deletedAt || !partner.active) {
    return { success: false, error: 'Invalid credentials' };
  }

  const valid = await compare(password, partner.passwordHash);
  if (!valid) {
    return { success: false, error: 'Invalid credentials' };
  }

  await setPartnerSession({
    userId: partner.id,
    email: partner.email,
    name: partner.name,
    companyName: partner.companyName,
    partnerConfigId: partner.partnerConfigId,
  });

  // Update lastLoginAt (fire-and-forget)
  db.update(partnerUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(partnerUsers.id, partner.id))
    .catch(() => {});

  return { success: true };
}

// ─── Helpers ─────────────────────────────────

export async function hashPartnerPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export const PARTNER_COOKIE_NAME = COOKIE_NAME;
