/**
 * Monthly Report Generation — Revisionssicher
 *
 * REGELN:
 * 1. Basiert AUSSCHLIESSLICH auf financial_ledger.
 * 2. SHA256-Hash für Integrität.
 * 3. Alte Reports werden archived, nie gelöscht.
 * 4. PDF darf NIEMALS überschrieben werden.
 * 5. Refund im März für Februar-Order → März-Report bekommt negative Werte.
 *    Kein Rewrite von Februar.
 *
 * Hash = SHA256(year + month + totalRevenue + totalGrossProfit + totalPeter + entriesCount + generatedAt)
 */

import { db } from '@/lib/db/drizzle';
import { financialLedger, monthlyReports, auditLog } from '@/lib/db/schema';
import { sql, and, gte, lte, eq } from 'drizzle-orm';
import { createHash } from 'crypto';

export interface ReportData {
  year: number;
  month: number;
  periodStart: Date;
  periodEnd: Date;
  totalRevenueCents: number;
  totalProducerCostCents: number;
  totalShippingCostCents: number;
  totalPaymentFeeCents: number;
  totalGrossProfitCents: number;
  totalPeterCents: number;
  totalAiggCents: number;
  ledgerEntriesCount: number;
  entries: LedgerEntry[];
}

interface LedgerEntry {
  id: number;
  orderId: number;
  entryType: string;
  revenueCents: number;
  producerCostCents: number;
  packagingCents: number;
  shippingCostCents: number;
  paymentFeeCents: number;
  customsCents: number;
  grossProfitCents: number;
  peterShareCents: number;
  aiggShareCents: number;
  notes: string | null;
  createdAt: Date;
}

/**
 * Aggregate ledger data for a given month.
 */
export async function aggregateMonthlyData(
  year: number,
  month: number
): Promise<ReportData> {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  // Load all ledger entries for the period
  const entries = await db.query.financialLedger.findMany({
    where: and(
      gte(financialLedger.createdAt, periodStart),
      lte(financialLedger.createdAt, periodEnd)
    ),
    orderBy: (l, { asc: a }) => [a(l.createdAt)],
  });

  // Aggregate
  let totalRevenue = 0;
  let totalProducerCost = 0;
  let totalShipping = 0;
  let totalPaymentFee = 0;
  let totalGrossProfit = 0;
  let totalPeter = 0;
  let totalAigg = 0;

  for (const e of entries) {
    totalRevenue += e.revenueCents;
    totalProducerCost += e.producerCostCents;
    totalShipping += e.shippingCostCents;
    totalPaymentFee += e.paymentFeeCents;
    totalGrossProfit += e.grossProfitCents;
    totalPeter += e.peterShareCents;
    totalAigg += e.aiggShareCents;
  }

  return {
    year,
    month,
    periodStart,
    periodEnd,
    totalRevenueCents: totalRevenue,
    totalProducerCostCents: totalProducerCost,
    totalShippingCostCents: totalShipping,
    totalPaymentFeeCents: totalPaymentFee,
    totalGrossProfitCents: totalGrossProfit,
    totalPeterCents: totalPeter,
    totalAiggCents: totalAigg,
    ledgerEntriesCount: entries.length,
    entries: entries as LedgerEntry[],
  };
}

/**
 * Compute SHA256 integrity hash.
 *
 * Hash = SHA256(year + month + totalRevenue + totalGrossProfit + totalPeter + entriesCount + generatedAt)
 */
export function computeReportHash(data: ReportData, generatedAt: Date): string {
  const input = [
    data.year,
    data.month,
    data.totalRevenueCents,
    data.totalGrossProfitCents,
    data.totalPeterCents,
    data.ledgerEntriesCount,
    generatedAt.toISOString(),
  ].join('|');

  return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate the detailed CSV for a report.
 */
export function generateDetailedCSV(data: ReportData): string {
  const header = [
    'Date',
    'Order ID',
    'Entry Type',
    'Revenue (EUR)',
    'Producer Cost (EUR)',
    'Packaging (EUR)',
    'Shipping (EUR)',
    'Payment Fee (EUR)',
    'Customs (EUR)',
    'Gross Profit (EUR)',
    'Peter Share (EUR)',
    'AIGG Share (EUR)',
    'Notes',
  ].join(',');

  const rows = data.entries.map((e) =>
    [
      new Date(e.createdAt).toISOString().split('T')[0],
      e.orderId,
      e.entryType,
      (e.revenueCents / 100).toFixed(2),
      (e.producerCostCents / 100).toFixed(2),
      (e.packagingCents / 100).toFixed(2),
      (e.shippingCostCents / 100).toFixed(2),
      (e.paymentFeeCents / 100).toFixed(2),
      (e.customsCents / 100).toFixed(2),
      (e.grossProfitCents / 100).toFixed(2),
      (e.peterShareCents / 100).toFixed(2),
      (e.aiggShareCents / 100).toFixed(2),
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ].join(',')
  );

  // Add summary row
  const summary = [
    '',
    'TOTAL',
    '',
    (data.totalRevenueCents / 100).toFixed(2),
    (data.totalProducerCostCents / 100).toFixed(2),
    '', // packaging total not tracked separately in aggregation
    (data.totalShippingCostCents / 100).toFixed(2),
    (data.totalPaymentFeeCents / 100).toFixed(2),
    '',
    (data.totalGrossProfitCents / 100).toFixed(2),
    (data.totalPeterCents / 100).toFixed(2),
    (data.totalAiggCents / 100).toFixed(2),
    '',
  ].join(',');

  return [header, ...rows, '', summary].join('\n');
}

/**
 * Generate a summary CSV for a report.
 */
export function generateSummaryCSV(data: ReportData, hash: string, generatedAt: Date): string {
  const monthName = new Date(data.year, data.month - 1).toLocaleDateString('de-AT', {
    month: 'long',
    year: 'numeric',
  });

  const lines = [
    'Austria Imperial Green Gold - Monthly Financial Report',
    `Period,${monthName}`,
    `Period Start,${data.periodStart.toISOString().split('T')[0]}`,
    `Period End,${data.periodEnd.toISOString().split('T')[0]}`,
    '',
    'Metric,Amount (EUR)',
    `Total Revenue,${(data.totalRevenueCents / 100).toFixed(2)}`,
    `Total Producer Cost,${(data.totalProducerCostCents / 100).toFixed(2)}`,
    `Total Shipping Cost,${(data.totalShippingCostCents / 100).toFixed(2)}`,
    `Total Payment Fees,${(data.totalPaymentFeeCents / 100).toFixed(2)}`,
    `Total Gross Profit,${(data.totalGrossProfitCents / 100).toFixed(2)}`,
    '',
    'Profit Split,Amount (EUR)',
    `Peter (50%),${(data.totalPeterCents / 100).toFixed(2)}`,
    `AIGG (50%),${(data.totalAiggCents / 100).toFixed(2)}`,
    '',
    `Ledger Entries,${data.ledgerEntriesCount}`,
    `Report Hash (SHA256),${hash}`,
    `Generated At,${generatedAt.toISOString()}`,
    '',
    'Generated from immutable financial ledger.',
  ];

  return lines.join('\n');
}

/**
 * Full report generation flow.
 *
 * 1. Archive existing reports for this period.
 * 2. Aggregate ledger data.
 * 3. Generate CSV.
 * 4. Compute hash.
 * 5. Store in monthly_reports.
 * 6. Log to audit_log.
 */
export async function generateMonthlyReport(
  year: number,
  month: number,
  generatedBy: string = 'system'
): Promise<{
  reportId: string;
  hash: string;
  data: ReportData;
  summaryCsv: string;
  detailedCsv: string;
}> {
  // 1. Archive any existing reports for this period
  await db
    .update(monthlyReports)
    .set({ status: 'archived' })
    .where(
      and(
        eq(monthlyReports.year, year),
        eq(monthlyReports.month, month),
        eq(monthlyReports.status, 'generated')
      )
    );

  // 2. Aggregate
  const data = await aggregateMonthlyData(year, month);

  // 3. Timestamps & hash
  const generatedAt = new Date();
  const hash = computeReportHash(data, generatedAt);

  // 4. Generate CSVs
  const summaryCsv = generateSummaryCSV(data, hash, generatedAt);
  const detailedCsv = generateDetailedCSV(data);

  // CSV paths (stored as references, actual files served via API)
  const csvPath = `reports/${year}-${String(month).padStart(2, '0')}/ledger.csv`;
  const pdfPath = `reports/${year}-${String(month).padStart(2, '0')}/report.pdf`;

  // 5. Insert report
  const [report] = await db
    .insert(monthlyReports)
    .values({
      year,
      month,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      totalRevenueCents: data.totalRevenueCents,
      totalProducerCostCents: data.totalProducerCostCents,
      totalShippingCostCents: data.totalShippingCostCents,
      totalPaymentFeeCents: data.totalPaymentFeeCents,
      totalGrossProfitCents: data.totalGrossProfitCents,
      totalPeterCents: data.totalPeterCents,
      totalAiggCents: data.totalAiggCents,
      ledgerEntriesCount: data.ledgerEntriesCount,
      reportHash: hash,
      csvPath,
      pdfPath,
      generatedAt,
      generatedBy,
      status: 'generated',
    })
    .returning();

  // 6. Audit log
  await db.insert(auditLog).values({
    entityType: 'monthly_report',
    entityId: 0, // UUID report, can't use int — log the action
    action: 'generated',
    newValues: {
      reportId: report.id,
      year,
      month,
      hash,
      entriesCount: data.ledgerEntriesCount,
      revenue: data.totalRevenueCents,
      grossProfit: data.totalGrossProfitCents,
    },
    performedBy: generatedBy,
  });

  return {
    reportId: report.id,
    hash,
    data,
    summaryCsv,
    detailedCsv,
  };
}
