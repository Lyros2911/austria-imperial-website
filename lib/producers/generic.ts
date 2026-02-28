/**
 * Generic Producer Client — Austria Imperial Green Gold
 *
 * Configurable producer client that reads from DB config.
 * Used for dynamically registered producers that don't have
 * custom implementations like Kiendler or Hernach.
 *
 * Supports both API and email modes, configured per-producer
 * in the producers table.
 */

import type {
  ProducerClient,
  ProducerConfig,
  ProducerOrderPayload,
  ProducerSendResult,
  ProducerStatusResult,
} from './types';
import { buildOrderEmail, sendProducerEmail } from './email';

export class GenericProducerClient implements ProducerClient {
  readonly name: string;

  constructor(private config: ProducerConfig) {
    this.name = config.slug;
  }

  isApiMode(): boolean {
    return this.config.mode === 'api' && !!this.config.apiUrl;
  }

  async sendOrder(payload: ProducerOrderPayload): Promise<ProducerSendResult> {
    if (this.isApiMode()) return this.sendViaApi(payload);
    return this.sendViaEmail(payload);
  }

  async getStatus(externalOrderId: string): Promise<ProducerStatusResult> {
    if (!this.isApiMode()) {
      // Email mode: status is managed manually via admin UI
      return { status: 'sent_to_producer' };
    }

    try {
      const res = await fetch(
        `${this.config.apiUrl}/orders/${externalOrderId}/status`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKeyEncrypted}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        throw new Error(`${this.name} API returned ${res.status}`);
      }

      const data = await res.json();

      return {
        status: data.status ?? 'sent_to_producer',
        trackingNumber: data.tracking_number ?? null,
        trackingUrl: data.tracking_url ?? null,
        rawPayload: data,
      };
    } catch (err) {
      throw new Error(
        `${this.name} status check failed: ${err instanceof Error ? err.message : 'Unknown'}`
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

      const res = await fetch(`${this.config.apiUrl}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKeyEncrypted}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'No body');
        return {
          success: false,
          method: 'api',
          error: `${this.name} API ${res.status}: ${errorBody}`,
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
        error: `${this.name} API unreachable: ${err instanceof Error ? err.message : 'Unknown'}`,
      };
    }
  }

  private async sendViaEmail(payload: ProducerOrderPayload): Promise<ProducerSendResult> {
    if (!this.config.contactEmail) {
      return {
        success: false,
        method: 'email',
        error: `No contact email configured for ${this.name}`,
      };
    }

    try {
      const emailData = buildOrderEmail(payload, this.name, this.config.contactEmail);
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
        error: `Email send error: ${err instanceof Error ? err.message : 'Unknown'}`,
      };
    }
  }
}
