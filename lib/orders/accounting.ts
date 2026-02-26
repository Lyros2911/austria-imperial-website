/**
 * AIGG Accounting Engine
 *
 * VERBINDLICHE REGELN (Strukturvereinbarung 26.02.2026, unterschrieben):
 * 1. Alle Beträge in EUR Cents (Integer-Arithmetik).
 * 2. Bruttogewinn = Revenue - ProducerCost - Packaging - Shipping - PaymentFee - Customs.
 * 3. Auryx AI: 10% vom D2C-Nettoumsatz (= Revenue nach Abzug Payment Fees) als Technologiepartner.
 * 4. Peter = 50% vom Restgewinn (Bruttogewinn - Auryx-Anteil). Gottfried = 50% vom Restgewinn.
 * 5. NICHT abziehbar vor der Gewinnverteilung: Marketing, Fixkosten, Hosting, Ads.
 * 6. financial_ledger ist APPEND-ONLY. Keine Updates, keine Deletes.
 * 7. Refunds erzeugen NEGATIVE Einträge im aktuellen Monat (kein Rückwirken).
 *
 * Revenue-Waterfall:
 *   Revenue → Vorleistungen → Laufende Kosten → Auryx 10% D2C → Peter 10% Export → Rest 50/50
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
  auryxShareCents: number;    // 10% D2C-Nettoumsatz (Technologiepartner)
  peterShareCents: number;    // 50% vom Restgewinn (nach Auryx-Abzug)
  aiggShareCents: number;     // 50% vom Restgewinn = Gottfrieds Anteil
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
 * Revenue-Waterfall nach Strukturvereinbarung 26.02.2026:
 *
 * 1. Bruttogewinn berechnen (Revenue - alle Produktkosten)
 * 2. Auryx AI: 10% vom D2C-Nettoumsatz (Revenue - Payment Fees)
 * 3. Restgewinn = Bruttogewinn - Auryx-Anteil
 * 4. Peter = 50% vom Restgewinn, Gottfried (AIGG) = 50% vom Restgewinn
 *
 * Bei ungeradem Cent: AIGG/Gottfried bekommt den Restcent (Math.floor für Peter).
 *
 * @param grossProfitCents - Bruttogewinn nach Abzug aller Produktkosten
 * @param d2cNetRevenueCents - D2C-Nettoumsatz (Revenue - Payment Fees) für Auryx 10%
 */
export function calculateProfitSplit(
  grossProfitCents: number,
  d2cNetRevenueCents?: number,
): ProfitSplit {
  // Auryx 10% vom D2C-Nettoumsatz (nur wenn D2C-Umsatz übergeben wird)
  const auryxShareCents = d2cNetRevenueCents
    ? Math.round(d2cNetRevenueCents * 0.10)
    : 0;

  // Restgewinn nach Auryx-Abzug
  const remainingProfitCents = Math.max(0, grossProfitCents - auryxShareCents);

  // 50/50 Split des Rests
  const peterShareCents = Math.floor(remainingProfitCents / 2);
  const aiggShareCents = remainingProfitCents - peterShareCents;

  return {
    grossProfitCents,
    auryxShareCents,
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

  // D2C-Nettoumsatz = Revenue - Payment Fees (Basis für Auryx 10%)
  const d2cNetRevenueCents = input.costs.revenueCents - input.costs.paymentFeeCents;
  const split = calculateProfitSplit(grossProfitCents, d2cNetRevenueCents);

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
    auryxShareCents: split.auryxShareCents,
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
