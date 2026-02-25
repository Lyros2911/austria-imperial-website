/**
 * Refund Engine — Austria Imperial Green Gold
 *
 * VERBINDLICHE REGELN:
 * 1. Refunds erzeugen NEGATIVE Einträge in financial_ledger.
 * 2. Kein Update alter Ledger-Einträge. APPEND-ONLY.
 * 3. Partial Refund → anteilig negative Beträge.
 * 4. Full Refund → Bruttogewinn = 0.
 * 5. Peters Anteil muss rückwirkend korrigiert werden (via negativem Eintrag).
 * 6. Jede Korrektur wird im Audit-Log gespeichert.
 * 7. Refunds erscheinen im aktuellen Monat (kein Rückwirken auf alte Reports).
 */

import { eq, and, sum } from 'drizzle-orm';
import { dbPool } from '@/lib/db/drizzle';
import { db } from '@/lib/db/drizzle';
import {
  orders,
  financialLedger,
  auditLog,
} from '@/lib/db/schema';
import { calculateGrossProfit, calculateProfitSplit, type CostBreakdown } from './accounting';

// ─── Types ─────────────────────────────────────

export interface RefundInput {
  orderId: number;
  refundAmountCents: number; // positive number — how much is being refunded
  stripeRefundId?: string;
  reason?: string;
  performedBy?: string;
}

export interface RefundResult {
  ledgerId: number;
  entryType: 'partial_refund' | 'full_refund';
  refundedRevenueCents: number;
  refundedPeterShareCents: number;
  refundedAiggShareCents: number;
}

// ─── Main Functions ────────────────────────────

/**
 * Process a refund by creating a NEGATIVE ledger entry.
 *
 * Logic:
 * 1. Look up the original sale ledger entry for this order.
 * 2. Calculate the refund proportion (refundAmount / originalRevenue).
 * 3. Apply that proportion to ALL cost columns → negative values.
 * 4. Calculate negative gross profit and negative profit split.
 * 5. Insert as new append-only ledger entry.
 *
 * If refund = 100% of revenue → full_refund.
 * If refund < 100% of revenue → partial_refund.
 */
export async function processRefund(input: RefundInput): Promise<RefundResult> {
  if (input.refundAmountCents <= 0) {
    throw new Error('Refund amount must be positive');
  }

  // Get all ledger entries for this order to calculate net position
  const existingEntries = await db.query.financialLedger.findMany({
    where: (fl, { eq }) => eq(fl.orderId, input.orderId),
  });

  if (existingEntries.length === 0) {
    throw new Error(`No ledger entries found for order ${input.orderId}`);
  }

  // Calculate current net revenue (sum of all entries)
  const netRevenueCents = existingEntries.reduce(
    (sum, e) => sum + e.revenueCents,
    0
  );

  if (netRevenueCents <= 0) {
    throw new Error(`Order ${input.orderId} has no remaining revenue to refund`);
  }

  if (input.refundAmountCents > netRevenueCents) {
    throw new Error(
      `Refund amount (${input.refundAmountCents}) exceeds remaining revenue (${netRevenueCents})`
    );
  }

  // Find the original sale entry to get cost proportions
  const originalSale = existingEntries.find((e) => e.entryType === 'sale');
  if (!originalSale) {
    throw new Error(`No original sale entry found for order ${input.orderId}`);
  }

  // Calculate refund proportion relative to original sale
  const proportion = input.refundAmountCents / originalSale.revenueCents;
  const isFullRefund = input.refundAmountCents === netRevenueCents;

  // Calculate proportional negative costs (all negative!)
  const refundCosts: CostBreakdown = {
    revenueCents: -input.refundAmountCents,
    producerCostCents: -Math.round(originalSale.producerCostCents * proportion),
    packagingCents: -Math.round(originalSale.packagingCents * proportion),
    shippingCostCents: -Math.round(originalSale.shippingCostCents * proportion),
    paymentFeeCents: -Math.round(originalSale.paymentFeeCents * proportion),
    customsCents: -Math.round(originalSale.customsCents * proportion),
  };

  const grossProfitCents = calculateGrossProfit(refundCosts);
  const split = calculateProfitSplit(grossProfitCents);

  const entryType = isFullRefund ? 'full_refund' : 'partial_refund';

  // Atomic transaction: ledger entry + audit log + order status update
  return await dbPool.transaction(async (tx) => {
    // 1) Negative ledger entry
    const [ledger] = await tx
      .insert(financialLedger)
      .values({
        orderId: input.orderId,
        entryType,
        revenueCents: refundCosts.revenueCents,
        producerCostCents: refundCosts.producerCostCents,
        packagingCents: refundCosts.packagingCents,
        shippingCostCents: refundCosts.shippingCostCents,
        paymentFeeCents: refundCosts.paymentFeeCents,
        customsCents: refundCosts.customsCents,
        grossProfitCents: split.grossProfitCents,
        peterShareCents: split.peterShareCents,
        aiggShareCents: split.aiggShareCents,
        notes: [
          `Refund: ${input.refundAmountCents} cents`,
          input.stripeRefundId ? `Stripe: ${input.stripeRefundId}` : null,
          input.reason ?? null,
        ]
          .filter(Boolean)
          .join(' | '),
      })
      .returning({ id: financialLedger.id });

    // 2) Update order status
    const newStatus = isFullRefund ? 'refunded' : 'paid'; // partial stays 'paid'
    await tx
      .update(orders)
      .set({
        status: isFullRefund ? 'refunded' : undefined,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, input.orderId));

    // 3) Audit log
    await tx.insert(auditLog).values({
      entityType: 'financial_ledger',
      entityId: ledger.id,
      action: `refund_${entryType}`,
      newValues: {
        orderId: input.orderId,
        refundAmountCents: input.refundAmountCents,
        stripeRefundId: input.stripeRefundId,
        grossProfitImpact: split.grossProfitCents,
        peterShareImpact: split.peterShareCents,
        aiggShareImpact: split.aiggShareCents,
      },
      performedBy: input.performedBy ?? 'system',
    });

    return {
      ledgerId: ledger.id,
      entryType,
      refundedRevenueCents: input.refundAmountCents,
      refundedPeterShareCents: Math.abs(split.peterShareCents),
      refundedAiggShareCents: Math.abs(split.aiggShareCents),
    };
  });
}
