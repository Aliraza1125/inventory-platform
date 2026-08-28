import { POSProviderName, POSConnectionMode } from '../models/POSConnection';

/** Credentials/context a provider needs to act on behalf of one connection. */
export interface POSConnectionContext {
  connectionId: string;
  accessToken?: string;
  refreshToken?: string;
  locationId?: string;
  metadata?: Record<string, unknown>;
}

export interface POSLocation {
  id: string;
  name: string;
  raw?: unknown;
}

export interface POSProduct {
  id: string; // the product id inside the POS's own catalog
  name: string;
  sku?: string;
  price?: number;
  raw?: unknown;
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  description?: string;
  price?: number; // minor currency units (cents); required by both Square/Toast catalogs
}

export interface AllocateInventoryInput {
  posProductId: string;
  locationId?: string;
  quantity: number;
}

export interface POSSaleRecord {
  externalTransactionId: string;
  posProductId: string;
  quantity: number;
  locationId?: string;
  occurredAt: Date;
  raw?: unknown;
}

/** The normalized shape every provider's webhook handler must produce. */
export interface NormalizedSaleEvent {
  provider: POSProviderName;
  externalTransactionId: string;
  posProductId: string;
  quantity: number;
  locationId?: string;
  occurredAt: Date;
  raw?: unknown;
}

export interface OAuthAuthorizeResult {
  authorizeUrl: string;
}

export interface OAuthExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  merchantId?: string;
}

// Common contract every POS integration implements; controllers/services depend only on this,
// never a concrete Square/Toast class.
export interface POSProvider {
  readonly providerName: POSProviderName;
  readonly mode: POSConnectionMode; // "live" or "mock" — surfaced to the UI as-is

  /** Verifies the connection is usable (e.g. pings the API with the stored token). */
  connect(ctx: POSConnectionContext): Promise<{ merchantId?: string; locationId?: string }>;

  disconnect(ctx: POSConnectionContext): Promise<void>;

  getLocations(ctx: POSConnectionContext): Promise<POSLocation[]>;

  createProduct(ctx: POSConnectionContext, input: CreateProductInput): Promise<POSProduct>;

  getProducts(ctx: POSConnectionContext): Promise<POSProduct[]>;

  /** Pushes/sets the sellable quantity for a product at the POS. */
  allocateInventory(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void>;

  updateInventory(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void>;

  /** Polling fallback for demos/tests where a webhook isn't practical. */
  getSales(ctx: POSConnectionContext, since?: Date): Promise<POSSaleRecord[]>;

  // Verifies the webhook signature and normalizes the payload into zero or more sale events.
  // Returns an array + is async because Square's webhook body only references an order — the
  // line items need a follow-up API call, which can yield multiple sale events per order.
  verifyAndParseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    ctx: POSConnectionContext,
  ): Promise<NormalizedSaleEvent[]>;
}
