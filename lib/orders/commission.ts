/**
 * Partner Commission Engine — Auryx Revenue Share
 *
 * Berechnet und speichert Commissions fuer Auryx-Partner.
 *
 * REGELN:
 * 1. Commission wird NUR berechnet wenn die Bestellung "attributed" ist
 *    (utm_campaign enthält 'auryx_engine' oder attribution_source != 'direct').
 * 2. AIGG: commission_percent = 0 → Status 'waived' (Gottfried ist Eigentümer beider Firmen).
 * 3. Zukünftige Kunden: commission_percent = 10 → Status 'pending' → 'paid' via Stripe Connect.
 * 4. partner_commissions ist APPEND-ONLY analog zu financial_ledger.
 * 5. Idempotent: Unique constraint auf (partner_config_id, order_id).
 */

import { db } from '@/lib/db/drizzle';
import { partnerConfig, partnerCommissions, auditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// ─── Types ─────────────────────────────────────

export interface CommissionInput {
  orderId: number;
  orderNumber: string;
  orderTotalCents: number;
  attributionSource: string;
  utmCampaign?: string;
  partnerCode: string; // e.g. 'aigg'
}

export interface CommissionResult {
  commissionId: number;
  commissionCents: number;
  commissionPercent: number;
  status: 'pending' | 'paid' | 'waived';
}

// ─── Core Function ─────────────────────────────

/**
 * Calculate and store a partner commission for an order.
 *
 * - Loads partner config by partnerCode
 * - Calculates commission: orderTotal * (commissionPercent / 100)
 * - If commission_percent = 0 → status 'waived'
 * - If commission_percent > 0 → status 'pending'
 * - Inserts into partner_commissions
 * - Returns commission details
 *
 * Idempotent: If commission already exists for this partner+order, returns null.
 */
export async function calculateAndStoreCommission(
  input: CommissionInput
): Promise<CommissionResult | null> {
  // 1) Load partner config
  const partner = await db.query.partnerConfig.findFirst({
    where: eq(partnerConfig.partnerCode, input.partnerCode),
  });

  if (!partner) {
    console.warn(
      `[Commission] Partner not found: ${input.partnerCode} — skipping commission for order ${input.orderNumber}`
    );
    return null;
  }

  if (!partner.active) {
    console.log(
      `[Commission] Partner ${input.partnerCode} is inactive — skipping commission for order ${input.orderNumber}`
    );
    return null;
  }

  // 2) Check idempotency (unique constraint: partner_config_id + order_id)
  const existing = await db.query.partnerCommissions.findFirst({
    where: (pc, { and, eq: eq2 }) =>
      and(
        eq2(pc.partnerConfigId, partner.id),
        eq2(pc.orderId, input.orderId)
      ),
  });

  if (existing) {
    console.log(
      `[Commission] Commission already exists for partner ${input.partnerCode} + order ${input.orderNumber} — idempotent skip`
    );
    return null;
  }

  // 3) Calculate commission
  const percent = parseFloat(String(partner.commissionPercent));
  const commissionCents = Math.round(input.orderTotalCents * (percent / 100));
  const status = percent === 0 ? 'waived' : 'pending';

  // 4) Insert commission record
  const [inserted] = await db
    .insert(partnerCommissions)
    .values({
      partnerConfigId: partner.id,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      orderTotalCents: input.orderTotalCents,
      commissionPercent: String(percent),
      commissionCents,
      attributionSource: input.attributionSource,
      utmCampaign: input.utmCampaign ?? null,
      status,
      notes:
        status === 'waived'
          ? `Commission waived — ${partner.partnerName} is platform owner`
          : undefined,
    })
    .returning({ id: partnerCommissions.id });

  // 5) Audit log
  await db.insert(auditLog).values({
    entityType: 'partner_commission',
    entityId: inserted.id,
    action: 'commission_created',
    newValues: {
      partnerCode: input.partnerCode,
      orderNumber: input.orderNumber,
      orderTotalCents: input.orderTotalCents,
      commissionPercent: percent,
      commissionCents,
      status,
    },
    performedBy: 'system',
  });

  console.log(
    `[Commission] Created: ${input.orderNumber} → ${partner.partnerName} ` +
      `${percent}% = €${(commissionCents / 100).toFixed(2)} (${status})`
  );

  return {
    commissionId: inserted.id,
    commissionCents,
    commissionPercent: percent,
    status: status as 'pending' | 'paid' | 'waived',
  };
}

// ─── Helper: Determine partner from attribution ──

/**
 * Determine the partner code from order attribution data.
 *
 * Logic:
 * - If utm_campaign contains 'auryx_engine' → 'aigg' (for AIGG shop)
 * - Future: different shops will have different partner codes
 *
 * Returns null if no partner attribution found (direct sales).
 */
export function getPartnerFromAttribution(
  attributionSource: string,
  utmCampaign?: string
): string | null {
  // Content-Engine generated links always have utm_campaign=auryx_engine
  if (utmCampaign && utmCampaign.includes('auryx_engine')) {
    return 'aigg'; // AIGG shop — always aigg partner for now
  }

  // Future: check attribution_source for other patterns
  // e.g. if source is 'auryx_partner_xyz' → return 'xyz'

  return null; // Direct sale — no partner commission
}
