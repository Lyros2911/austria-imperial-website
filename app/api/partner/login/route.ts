/**
 * Partner Login API
 * POST /api/partner/login
 */
import { NextRequest, NextResponse } from 'next/server';
import { partnerLogin } from '@/lib/auth/partner';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const result = await partnerLogin(email, password);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
