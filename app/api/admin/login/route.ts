/**
 * Admin Login API
 *
 * POST /api/admin/login
 * Body: { email, password }
 * Sets httpOnly JWT cookie on success.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminLogin } from '@/lib/auth/admin';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe' },
        { status: 400 }
      );
    }

    const result = await adminLogin(parsed.data.email, parsed.data.password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Login] Error:', err);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
