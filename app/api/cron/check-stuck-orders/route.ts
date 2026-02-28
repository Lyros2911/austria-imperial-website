/**
 * Stuck-Order Detection — Austria Imperial Green Gold
 *
 * Prüft stündlich auf:
 * 1. Fulfillment-Orders im Status 'failed' (Dispatch 5x fehlgeschlagen)
 * 2. Fulfillment-Orders im Status 'pending' seit >1 Stunde (hängen geblieben)
 *
 * Sendet Alert-Email an info@austriaimperial.com mit Details.
 * Aufgerufen per externem Cron (n8n, cron-job.org, etc.)
 *
 * Sicherung: CRON_SECRET Header verhindert unbefugten Aufruf.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { fulfillmentOrders, orders } from '@/lib/db/schema';
import { eq, and, or, lt } from 'drizzle-orm';
import { sendEmail, AIGG_NOTIFICATION_EMAILS } from '@/lib/email/resend';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Auth: Simple shared secret (set in env)
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Find stuck fulfillment orders:
  // 1. status = 'failed' (any time)
  // 2. status = 'pending' AND created > 1 hour ago
  const stuckOrders = await db.query.fulfillmentOrders.findMany({
    where: or(
      eq(fulfillmentOrders.status, 'failed'),
      and(
        eq(fulfillmentOrders.status, 'pending'),
        lt(fulfillmentOrders.createdAt, oneHourAgo)
      )
    ),
    with: {
      order: true,
    },
  });

  if (stuckOrders.length === 0) {
    return NextResponse.json({ status: 'ok', stuck: 0 });
  }

  // Build alert email
  const failedOrders = stuckOrders.filter((fo) => fo.status === 'failed');
  const pendingStuck = stuckOrders.filter((fo) => fo.status === 'pending');

  const lines: string[] = [
    `⚠️ STUCK ORDER ALERT — ${new Date().toISOString()}`,
    '',
  ];

  if (failedOrders.length > 0) {
    lines.push(`🔴 ${failedOrders.length} FAILED (Dispatch 5x fehlgeschlagen):`);
    lines.push('');
    for (const fo of failedOrders) {
      lines.push(
        `  Order: ${fo.order?.orderNumber ?? fo.orderId}`,
        `  Producer: ${fo.producer}`,
        `  Retries: ${fo.retryCount}`,
        `  Error: ${fo.lastError ?? 'unknown'}`,
        `  Created: ${fo.createdAt.toISOString()}`,
        ''
      );
    }
  }

  if (pendingStuck.length > 0) {
    lines.push(`🟡 ${pendingStuck.length} PENDING seit >1 Stunde:`);
    lines.push('');
    for (const fo of pendingStuck) {
      lines.push(
        `  Order: ${fo.order?.orderNumber ?? fo.orderId}`,
        `  Producer: ${fo.producer}`,
        `  Created: ${fo.createdAt.toISOString()}`,
        ''
      );
    }
  }

  lines.push(
    '---',
    'Admin: https://austriaimperial.com/admin/fulfillment',
    ''
  );

  const body = lines.join('\n');

  await sendEmail({
    to: AIGG_NOTIFICATION_EMAILS,
    subject: `⚠️ ${stuckOrders.length} Stuck Order(s) — Austria Imperial`,
    text: body,
  });

  console.log(
    `[Cron] Stuck order check: ${failedOrders.length} failed, ${pendingStuck.length} pending-stuck. Alert sent.`
  );

  return NextResponse.json({
    status: 'alert_sent',
    stuck: stuckOrders.length,
    failed: failedOrders.length,
    pendingStuck: pendingStuck.length,
  });
}
