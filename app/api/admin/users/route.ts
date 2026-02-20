/**
 * Admin User Management API
 *
 * GET  /api/admin/users — List all admin users (admin only)
 * POST /api/admin/users — Create new admin user (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, hashPassword } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { adminUsers, auditLog } from '@/lib/db/schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── GET: List all admin users ────────────────

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const users = await db.query.adminUsers.findMany({
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });

  return NextResponse.json({ users });
}

// ─── POST: Create new admin user ──────────────

const createSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  name: z.string().min(1, 'Name ist Pflicht'),
  password: z.string().min(8, 'Passwort muss mind. 8 Zeichen haben'),
  role: z.enum(['admin', 'viewer']),
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Check if email already exists
  const existing = await db.query.adminUsers.findFirst({
    where: (u, { eq }) => eq(u.email, parsed.data.email),
  });

  if (existing) {
    return NextResponse.json(
      { error: 'E-Mail-Adresse bereits vergeben' },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const [newUser] = await db
    .insert(adminUsers)
    .values({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: parsed.data.role,
    })
    .returning({ id: adminUsers.id, email: adminUsers.email });

  // Audit log
  await db.insert(auditLog).values({
    entityType: 'admin_user',
    entityId: newUser.id,
    action: 'create',
    newValues: { email: parsed.data.email, name: parsed.data.name, role: parsed.data.role },
    performedBy: session.email,
  });

  return NextResponse.json({ success: true, user: newUser }, { status: 201 });
}
