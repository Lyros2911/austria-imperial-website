/**
 * Admin Session Check API
 *
 * GET /api/admin/session
 * Returns current admin session payload or 401.
 */

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  return NextResponse.json({
    userId: session.userId,
    email: session.email,
    role: session.role,
    name: session.name,
  });
}
