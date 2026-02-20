/**
 * Reset Admin User Password
 *
 * POST /api/admin/users/[id]/reset-password
 * Body: { password: string }
 * Only admins can reset passwords.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { hashPassword } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { adminUsers, auditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const resetSchema = z.object({
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, userId),
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Ungültige Eingabe' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await db
      .update(adminUsers)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, userId));

    await db.insert(auditLog).values({
      entityType: 'admin_user',
      entityId: userId,
      action: 'reset_password',
      oldValues: {},
      newValues: { passwordReset: true },
      performedBy: session.email,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Passwort-Reset fehlgeschlagen' },
      { status: 500 }
    );
  }
}
