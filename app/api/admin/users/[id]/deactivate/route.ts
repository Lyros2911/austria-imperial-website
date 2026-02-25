/**
 * Deactivate Admin User
 *
 * POST /api/admin/users/[id]/deactivate
 * Soft-deletes the user by setting deletedAt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { adminUsers, auditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

  // Don't allow deactivating yourself
  if (userId === session.userId) {
    return NextResponse.json(
      { error: 'Du kannst dich nicht selbst deaktivieren' },
      { status: 400 }
    );
  }

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, userId),
  });

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
  }

  const now = new Date();
  const isDeactivated = !!user.deletedAt;

  // Toggle: deactivate or reactivate
  await db
    .update(adminUsers)
    .set({
      deletedAt: isDeactivated ? null : now,
      updatedAt: now,
    })
    .where(eq(adminUsers.id, userId));

  await db.insert(auditLog).values({
    entityType: 'admin_user',
    entityId: userId,
    action: isDeactivated ? 'reactivate' : 'deactivate',
    oldValues: { deletedAt: user.deletedAt },
    newValues: { deletedAt: isDeactivated ? null : now },
    performedBy: session.email,
  });

  return NextResponse.json({
    success: true,
    active: isDeactivated, // toggled state
  });
}
