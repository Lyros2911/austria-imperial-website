/**
 * AIGG Accounting Engine
 *
 * VERBINDLICHE REGELN (aus Beteiligungsarchitektur):
 * 1. Alle Beträge in EUR Cents (Integer-Arithmetik).
 * 2. Bruttogewinn = Revenue - ProducerCost - Packaging - Shipping - PaymentFee - Customs.
 * 3. Peter = 50% vom Bruttogewinn. AIGG = 50% vom Bruttogewinn.
 * 4. NICHT abziehbar vor Peters Anteil: Marketing, AURYX Retainer, Fixkosten, Hosting, Ads.
 * 5. financial_ledger ist APPEND-ONLY. Keine Updates, keine Deletes.
 * 6. Refunds erzeugen NEGATIVE Einträge im aktuellen Monat (kein Rückwirken).
 */

import { db } from '@/lib/db/drizzle';
import { financialLedger, auditLog } from '@/lib/db/schema';
import type { NewFinancialLedgerEntry } from '@/lib/db/schema';

// ─── Types ─────────────────────────────────────

export interface CostBreakdown {
  revenueCents: number;
  producerCostCents: number;
  packagingCents: number;
  shippingCostCents: number;
  paymentFeeCents: number;
  customsCents: number;
}

export interface ProfitSplit {
  grossProfitCents: number;
  peterShareCents: number;
  aiggShareCents: number;
}

export interface LedgerEntryInput {
  orderId: number;
  entryType: 'sale' | 'partial_refund' | 'full_refund' | 'adjustment';
  costs: CostBreakdown;
  notes?: string;
}

// ─── Core Functions ────────────────────────────

/**
 * Calculate gross profit from a cost breakdown.
 *
 * Formel (VERBINDLICH):
 *   gross_profit = revenue - producer_cost - packaging - shipping - payment_fee - customs
 *
 * NICHT abziehbar: Marketing, AURYX Retainer, Fixkosten, Hosting, Ads.
 */
export function calculateGrossProfit(costs: CostBreakdown): number {
  return (
    costs.revenueCents -
    costs.producerCostCents -
    costs.packagingCents -
    costs.shippingCostCents -
    costs.paymentFeeCents -
    costs.customsCents
  );
}

/**
 * Calculate the 50/50 profit split between Peter and AIGG.
 *
 * Bei ungeradem Cent: AIGG bekommt den Restcent (Math.floor für Peter).
 * Beispiel: grossProfit = 101 → Peter = 50, AIGG = 51
 */
export function calculateProfitSplit(grossProfitCents: number): ProfitSplit {
  const peterShareCents = Math.floor(grossProfitCents / 2);
  const aiggShareCents = grossProfitCents - peterShareCents;

  return {
    grossProfitCents,
    peterShareCents,
    aiggShareCents,
  };
}

/**
 * Create a financial ledger entry — APPEND-ONLY.
 *
 * This is the ONLY function that writes to financial_ledger.
 * It calculates gross profit and profit split automatically.
 * Also creates an audit log entry for traceability.
 *
 * Returns the created ledger entry ID.
 */
export async function createLedgerEntry(
  input: LedgerEntryInput
): Promise<{ ledgerId: number; split: ProfitSplit }> {
  const grossProfitCents = calculateGrossProfit(input.costs);
  const split = calculateProfitSplit(grossProfitCents);

  const entry: NewFinancialLedgerEntry = {
    orderId: input.orderId,
    entryType: input.entryType,
    revenueCents: input.costs.revenueCents,
    producerCostCents: input.costs.producerCostCents,
    packagingCents: input.costs.packagingCents,
    shippingCostCents: input.costs.shippingCostCents,
    paymentFeeCents: input.costs.paymentFeeCents,
    customsCents: input.costs.customsCents,
    grossProfitCents: split.grossProfitCents,
    peterShareCents: split.peterShareCents,
    aiggShareCents: split.aiggShareCents,
    notes: input.notes,
  };

  const [inserted] = await db.insert(financialLedger).values(entry).returning({ id: financialLedger.id });

  // Audit log — immutable record of this financial event
  await db.insert(auditLog).values({
    entityType: 'financial_ledger',
    entityId: inserted.id,
    action: `ledger_${input.entryType}`,
    newValues: entry,
    performedBy: 'system',
  });

  return { ledgerId: inserted.id, split };
}

// ─── Validation Helpers ────────────────────────

/**
 * Validate that a cost breakdown has no negative values (except for refund entries).
 */
export function validateCosts(costs: CostBreakdown, isRefund: boolean): string[] {
  const errors: string[] = [];

  if (!isRefund) {
    if (costs.revenueCents < 0) errors.push('Revenue cannot be negative for a sale');
    if (costs.producerCostCents < 0) errors.push('Producer cost cannot be negative');
    if (costs.packagingCents < 0) errors.push('Packaging cost cannot be negative');
    if (costs.shippingCostCents < 0) errors.push('Shipping cost cannot be negative');
    if (costs.paymentFeeCents < 0) errors.push('Payment fee cannot be negative');
    if (costs.customsCents < 0) errors.push('Customs cost cannot be negative');
  } else {
    // Refunds: revenue should be negative (or zero), costs should be negative (or zero)
    if (costs.revenueCents > 0) errors.push('Refund revenue must be zero or negative');
  }

  // Integer check
  for (const [key, value] of Object.entries(costs)) {
    if (!Number.isInteger(value)) {
      errors.push(`${key} must be an integer (cents), got ${value}`);
    }
  }

  return errors;
}
