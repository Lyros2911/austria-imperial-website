/**
 * Stripe Connect — Auryx Revenue Share Platform
 *
 * Verwaltet die Stripe Connect Integration für Partner-Auszahlungen.
 *
 * ARCHITEKTUR:
 * - Auryx AI LLC = Platform Account (Stripe Connect Plattform)
 * - Jeder Auryx-Kunde = Connected Account
 * - Bei attributed Verkäufen: application_fee_amount = commission %
 * - Geld fliesst: Kunde → Connected Account, Auryx nimmt application_fee
 *
 * AIGG SONDERFALL (Verein, Stand: März 2026):
 * - AIGG nutzt eigenen Stripe-Account (kein Connected Account)
 * - Auryx erhält Dienstleistungsvergütung statt commission
 * - Checkout läuft ganz normal ohne Connect-Parameter
 *
 * ZUKÜNFTIGE KUNDEN:
 * - Eigener Stripe-Account als Connected Account
 * - 10% application_fee_amount auf attributed Verkäufe
 * - Automatische Auszahlung via Stripe
 */

import { db } from '@/lib/db/drizzle';
import { partnerConfig, partnerCommissions, auditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

// ─── Types ─────────────────────────────────────

export interface ConnectConfig {
  /** Stripe Connected Account ID (e.g. acct_xxx) */
  stripeAccountId: string;
  /** Commission percentage (e.g. 10 for 10%) */
  commissionPercent: number;
  /** Partner code for identification */
  partnerCode: string;
  /** Partner name for display */
  partnerName: string;
}

export interface ConnectCheckoutParams {
  /** Application fee in cents (Auryx's cut) */
  applicationFeeAmount: number;
  /** Stripe Connect transfer_data for destination account */
  transferData: {
    destination: string;
  };
}

// ─── Core Functions ────────────────────────────

/**
 * Get the current shop's partner code from environment.
 *
 * Each Auryx client shop has PARTNER_CODE set in .env.
 * AIGG: PARTNER_CODE=aigg (or defaults to 'aigg' if not set).
 */
export function getShopPartnerCode(): string {
  return process.env.PARTNER_CODE || 'aigg';
}

/**
 * Load Connect configuration for the current shop's partner.
 *
 * Returns null if:
 * - Partner not found or inactive
 * - Partner has no Stripe Connected Account (e.g. AIGG)
 * - Commission is 0% (e.g. AIGG — platform owner)
 *
 * Only returns a ConnectConfig when ALL conditions are met:
 * 1. Partner exists and is active
 * 2. Partner has stripe_connected_account_id set
 * 3. Commission percent > 0
 */
export async function getConnectConfig(): Promise<ConnectConfig | null> {
  const partnerCode = getShopPartnerCode();

  const partner = await db.query.partnerConfig.findFirst({
    where: eq(partnerConfig.partnerCode, partnerCode),
  });

  if (!partner || !partner.active) {
    return null;
  }

  const percent = parseFloat(String(partner.commissionPercent));

  // No Connect needed for 0% commission (AIGG) or no connected account
  if (percent === 0 || !partner.stripeConnectedAccountId) {
    return null;
  }

  return {
    stripeAccountId: partner.stripeConnectedAccountId,
    commissionPercent: percent,
    partnerCode: partner.partnerCode,
    partnerName: partner.partnerName,
  };
}

/**
 * Build Stripe Connect parameters for a checkout session.
 *
 * Calculates the application_fee_amount (Auryx's commission) and
 * sets up transfer_data to route the payment to the connected account.
 *
 * @param totalCents - Total order amount in cents
 * @param config - Connect configuration (from getConnectConfig)
 * @returns Connect parameters to spread into stripe.checkout.sessions.create()
 */
export function buildConnectCheckoutParams(
  totalCents: number,
  config: ConnectConfig
): ConnectCheckoutParams {
  const applicationFeeAmount = Math.round(
    totalCents * (config.commissionPercent / 100)
  );

  return {
    applicationFeeAmount,
    transferData: {
      destination: config.stripeAccountId,
    },
  };
}

/**
 * Update a commission record after Stripe Connect transfer completes.
 *
 * Called from webhook when application_fee is collected.
 * Sets status from 'pending' → 'paid' and stores the transfer ID.
 */
export async function markCommissionPaid(
  orderId: number,
  stripeTransferId: string
): Promise<boolean> {
  try {
    const commission = await db.query.partnerCommissions.findFirst({
      where: (pc, { and, eq: eq2 }) =>
        and(eq2(pc.orderId, orderId), eq2(pc.status, 'pending')),
    });

    if (!commission) {
      console.log(
        `[Connect] No pending commission found for order ${orderId} — skip`
      );
      return false;
    }

    await db
      .update(partnerCommissions)
      .set({
        status: 'paid',
        stripeTransferId,
        paidAt: new Date(),
      })
      .where(eq(partnerCommissions.id, commission.id));

    await db.insert(auditLog).values({
      entityType: 'partner_commission',
      entityId: commission.id,
      action: 'commission_paid',
      newValues: {
        stripeTransferId,
        orderNumber: commission.orderNumber,
        commissionCents: commission.commissionCents,
      },
      performedBy: 'stripe_connect',
    });

    console.log(
      `[Connect] Commission ${commission.id} marked as paid ` +
        `(order: ${commission.orderNumber}, transfer: ${stripeTransferId})`
    );

    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Connect] markCommissionPaid failed: ${msg}`);
    return false;
  }
}
