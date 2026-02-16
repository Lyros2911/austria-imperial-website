/**
 * Admin Logout API
 *
 * POST /api/admin/logout
 * Clears the admin session cookie.
 */

import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/auth/admin';

export async function POST() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
