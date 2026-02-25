/**
 * Hernach Producer Client — Kren (Meerrettich)
 *
 * Modes:
 * 1. API Mode: Direct REST integration (HERNACH_API_URL + HERNACH_API_KEY)
 * 2. Email Fallback: Sends structured order email to HERNACH_EMAIL
 *
 * Hernach handles:
 * - Steirischer Kren (100g, 200g, 500g)
 * - Packaging + Versand from their facility
 */

import type {
  ProducerClient,
  ProducerOrderPayload,
  ProducerSendResult,
  ProducerStatusResult,
} from './types';
import { buildOrderEmail, sendProducerEmail } from './email';

export class HernachClient implements ProducerClient {
  readonly name = 'hernach' as const;

  isApiMode(): boolean {
    return !!(process.env.HERNACH_API_URL && process.env.HERNACH_API_KEY);
  }

  async sendOrder(payload: ProducerOrderPayload): Promise<ProducerSendResult> {
    if (this.isApiMode()) {
      return this.sendViaApi(payload);
    }
    return this.sendViaEmail(payload);
  }

  async getStatus(externalOrderId: string): Promise<ProducerStatusResult> {
    if (!this.isApiMode()) {
      return { status: 'sent_to_producer' };
    }

    try {
      const res = await fetch(
        `${process.env.HERNACH_API_URL}/orders/${externalOrderId}/status`,
        {
          headers: {
            Authorization: `Bearer ${process.env.HERNACH_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Hernach API returned ${res.status}`);
      }

      const data = await res.json();

      return {
        status: mapHernachStatus(data.status),
        trackingNumber: data.tracking_number ?? null,
        trackingUrl: data.tracking_url ?? null,
        rawPayload: data,
      };
    } catch (err) {
      throw new Error(
        `Hernach status check failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  // ─── Private ──────────────────────────────────

  private async sendViaApi(payload: ProducerOrderPayload): Promise<ProducerSendResult> {
    try {
      const apiPayload = {
        external_reference: `AIGG-FO-${payload.fulfillmentOrderId}`,
        order_number: payload.orderNumber,
        items: payload.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          product_name: item.productName,
        })),
        shipping_address: {
          name: payload.shipping.name,
          street: payload.shipping.street,
          street2: payload.shipping.street2 || undefined,
          city: payload.shipping.city,
          postal_code: payload.shipping.postalCode,
          country: payload.shipping.country,
        },
        customer_email: payload.customerEmail,
        notes: payload.notes,
      };

      const res = await fetch(`${process.env.HERNACH_API_URL}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HERNACH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'No body');
        return {
          success: false,
          method: 'api',
          error: `Hernach API ${res.status}: ${errorBody}`,
        };
      }

      const data = await res.json();

      return {
        success: true,
        externalOrderId: data.order_id ?? data.id ?? null,
        method: 'api',
      };
    } catch (err) {
      return {
        success: false,
        method: 'api',
        error: `Hernach API unreachable: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  private async sendViaEmail(payload: ProducerOrderPayload): Promise<ProducerSendResult> {
    const email = process.env.HERNACH_EMAIL;
    if (!email) {
      return {
        success: false,
        method: 'email',
        error: 'HERNACH_EMAIL not configured',
      };
    }

    try {
      const emailData = buildOrderEmail(payload, 'hernach', email);
      const sent = await sendProducerEmail(emailData);

      if (!sent) {
        return {
          success: false,
          method: 'email',
          error: 'Email delivery failed',
        };
      }

      return {
        success: true,
        externalOrderId: null,
        method: 'email',
      };
    } catch (err) {
      return {
        success: false,
        method: 'email',
        error: `Email send error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }
}

function mapHernachStatus(
  externalStatus: string
): ProducerStatusResult['status'] {
  const mapping: Record<string, ProducerStatusResult['status']> = {
    received: 'confirmed',
    processing: 'confirmed',
    packed: 'confirmed',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };
  return mapping[externalStatus?.toLowerCase()] ?? 'sent_to_producer';
}
