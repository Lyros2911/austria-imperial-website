/**
 * Producer Integration Types — Austria Imperial Green Gold
 *
 * Standardisiertes Interface für alle Produzenten.
 * Jeder Producer MUSS dieses Interface implementieren.
 *
 * MODI:
 * 1. API Mode: Direkte REST-API Integration (wenn verfügbar)
 * 2. Email Fallback: Strukturierte Bestellmail an Producer
 *    → Admin trägt tracking_number + status manuell nach
 *
 * Neue Produzenten: types.ts + <name>.ts implementieren + dispatch.ts registrieren
 * → Kein Core-System-Umbau nötig.
 */

export type ProducerName = 'kiendler' | 'hernach';

export type FulfillmentStatus =
  | 'pending'
  | 'sent_to_producer'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'failed'
  | 'cancelled';

/**
 * Data sent to producer to create a fulfillment order.
 */
export interface ProducerOrderPayload {
  fulfillmentOrderId: number;
  orderId: number;
  orderNumber: string;
  items: ProducerOrderItem[];
  shipping: ProducerShippingAddress;
  customerEmail?: string;
  notes?: string;
}

export interface ProducerOrderItem {
  sku: string;
  productName: string;
  variantName: string;
  quantity: number;
  sizeMl?: number | null;
  weightGrams?: number | null;
}

export interface ProducerShippingAddress {
  name: string;
  street: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

/**
 * Result of sending an order to a producer.
 */
export interface ProducerSendResult {
  success: boolean;
  /** External reference ID from the producer's system (null for email fallback) */
  externalOrderId?: string | null;
  /** How the order was sent */
  method: 'api' | 'email';
  /** Error message if failed */
  error?: string;
}

/**
 * Status check result from a producer.
 */
export interface ProducerStatusResult {
  status: FulfillmentStatus;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  /** Raw payload from producer for logging */
  rawPayload?: Record<string, unknown>;
}

/**
 * The Producer interface that each implementation must fulfill.
 *
 * Robust Contract:
 * - sendOrder MUST NOT throw — returns { success: false, error } on failure
 * - getStatus MAY throw if external API is unreachable (caller handles retry)
 */
export interface ProducerClient {
  readonly name: ProducerName;

  /**
   * Send a fulfillment order to this producer.
   *
   * API mode: POST to producer's REST API.
   * Email mode: Send structured email with order details.
   *
   * MUST NOT throw — wraps errors in result.
   */
  sendOrder(payload: ProducerOrderPayload): Promise<ProducerSendResult>;

  /**
   * Check status of an existing order at the producer.
   *
   * Only meaningful in API mode. Email-only producers
   * return the current DB status (manual updates via admin).
   */
  getStatus(externalOrderId: string): Promise<ProducerStatusResult>;

  /**
   * Whether this producer is in API mode or email fallback.
   */
  isApiMode(): boolean;
}

/**
 * Email template for producer order notifications.
 */
export interface ProducerEmailData {
  to: string;
  subject: string;
  body: string;
  producerName: ProducerName;
  fulfillmentOrderId: number;
}
