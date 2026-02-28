/**
 * Partner Session Check API
 * GET /api/partner/session
 */
import { NextResponse } from 'next/server';
import { getPartnerSession } from '@/lib/auth/partner';

export async function GET() {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  return NextResponse.json({
    userId: session.userId,
    email: session.email,
    name: session.name,
    companyName: session.companyName,
    partnerConfigId: session.partnerConfigId,
  });
}
