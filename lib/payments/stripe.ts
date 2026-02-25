/**
 * Stripe Client — Austria Imperial Green Gold
 *
 * Same Stripe Account as Auryx AI LLC (Wyoming).
 * Mode: 'payment' (one-time checkout, NOT subscription).
 */

import Stripe from 'stripe';

/**
 * Lazy-initialized Stripe client.
 * Does NOT throw at import time (required for Next.js build).
 * Throws at first usage if STRIPE_SECRET_KEY is not set.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Convenience alias — most files import { stripe } from '...'
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Extract the actual Stripe fee in cents from a PaymentIntent.
 *
 * PFLICHT: payment_fee_cents in financial_ledger MUSS von Stripe's
 * balance_transaction kommen — NICHT geschätzt.
 *
 * Requires expanding latest_charge.balance_transaction on the PaymentIntent.
 */
export async function getStripeFeeCents(paymentIntentId: string): Promise<number> {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge.balance_transaction'],
  });

  const charge = pi.latest_charge;
  if (!charge || typeof charge === 'string') {
    throw new Error(`Cannot expand charge for PaymentIntent ${paymentIntentId}`);
  }

  const bt = charge.balance_transaction;
  if (!bt || typeof bt === 'string') {
    throw new Error(`Cannot expand balance_transaction for PaymentIntent ${paymentIntentId}`);
  }

  return bt.fee;
}
