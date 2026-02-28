/**
 * Partner Logout API
 * POST /api/partner/logout
 */
import { NextResponse } from 'next/server';
import { clearPartnerSession } from '@/lib/auth/partner';

export async function POST() {
  await clearPartnerSession();
  return NextResponse.json({ success: true });
}
