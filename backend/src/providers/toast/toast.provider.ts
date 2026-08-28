import crypto from 'crypto';
import { env, isToastLive } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import {
  AllocateInventoryInput,
  CreateProductInput,
  NormalizedSaleEvent,
  POSConnectionContext,
  POSLocation,
  POSProduct,
  POSProvider,
  POSSaleRecord,
} from '../pos-provider.interface';

// Real Toast integration, built against Toast's published API reference (doc.toasttab.com) —
// never run against a live account (Toast's partner access is unavailable from Pakistan).
const TOAST_API_BASE = 'https://ws-api.toasttab.com';

interface ToastAuthResponse {
  token?: { accessToken?: string; tokenType?: string; expiresIn?: number };
}

export class ToastProvider implements POSProvider {
  readonly providerName = 'toast' as const;
  readonly mode = 'live' as const;

  private assertConfigured(): void {
    if (!isToastLive()) {
      throw AppError.badRequest(
        'Real Toast integration is not configured. Set TOAST_MODE=live with TOAST_CLIENT_ID, ' +
          'TOAST_CLIENT_SECRET and TOAST_RESTAURANT_GUID, or use Mock Toast for the demo.',
        'TOAST_NOT_CONFIGURED',
      );
    }
  }

  // Tokens are short-lived (~hours) — fetch a fresh one per request instead of caching.
  private async authenticate(): Promise<string> {
    if (!env.toast.clientId || !env.toast.clientSecret) {
      throw AppError.badRequest('TOAST_CLIENT_ID and TOAST_CLIENT_SECRET must be set.', 'MISSING_CREDENTIALS');
    }
    const res = await fetch(`${TOAST_API_BASE}/authentication/v1/authentication/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: env.toast.clientId,
        clientSecret: env.toast.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }),
    });
    if (!res.ok) {
      throw AppError.badGateway(`Toast authentication failed (${res.status}).`, 'TOAST_AUTH_FAILED');
    }
    const body = (await res.json()) as ToastAuthResponse;
    if (!body.token?.accessToken) {
      throw AppError.badGateway('Toast authentication response had no access token.', 'TOAST_AUTH_FAILED');
    }
    return body.token.accessToken;
  }

  private restaurantGuid(ctx: POSConnectionContext): string {
    const guid = ctx.locationId ?? env.toast.restaurantGuid;
    if (!guid) {
      throw AppError.badRequest('A Toast restaurant GUID is required (TOAST_RESTAURANT_GUID).', 'MISSING_LOCATION');
    }
    return guid;
  }

  private async request<T>(
    method: string,
    path: string,
    ctx: POSConnectionContext,
    options: { body?: unknown; query?: Record<string, string> } = {},
  ): Promise<T> {
    const token = await this.authenticate();
    const url = new URL(`${TOAST_API_BASE}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Toast-Restaurant-External-ID': this.restaurantGuid(ctx),
        'Content-Type': 'application/json',
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw AppError.badGateway(`Toast API ${method} ${path} failed (${res.status}): ${text}`, 'TOAST_API_ERROR');
    }
    return (await res.json()) as T;
  }

  async connect(ctx: POSConnectionContext): Promise<{ merchantId?: string; locationId?: string }> {
    this.assertConfigured();
    const guid = this.restaurantGuid(ctx);
    await this.request('GET', `/restaurants/v1/restaurants/${guid}`, ctx); // also verifies credentials work
    return { merchantId: guid, locationId: guid };
  }

  async disconnect(): Promise<void> {
    // Nothing to revoke — tokens are fetched fresh per request, never persisted.
  }

  async getLocations(ctx: POSConnectionContext): Promise<POSLocation[]> {
    this.assertConfigured();
    const guid = this.restaurantGuid(ctx);
    const info = await this.request<{ general?: { name?: string } }>('GET', `/restaurants/v1/restaurants/${guid}`, ctx);
    return [{ id: guid, name: info.general?.name ?? guid, raw: info }];
  }

  async createProduct(): Promise<POSProduct> {
    this.assertConfigured();
    // Toast's Menus API is read-only — items can only be created in Toast's own dashboard.
    throw AppError.badRequest(
      'Toast does not support creating menu items via API — items must already exist in Toast. ' +
        'Create it in Toast first, then allocate here using its existing menu item GUID.',
      'TOAST_ITEM_MUST_EXIST',
    );
  }

  async getProducts(ctx: POSConnectionContext): Promise<POSProduct[]> {
    this.assertConfigured();
    const items = await this.request<{ guid: string; name: string; sku?: string }[]>('GET', '/config/v2/menuItems', ctx);
    // No price field here — it lives in the nested Menus v3 structure, not this flat list.
    return items.map((item) => ({ id: item.guid, name: item.name, sku: item.sku, raw: item }));
  }

  async allocateInventory(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void> {
    await this.setStock(ctx, input);
  }

  async updateInventory(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void> {
    await this.setStock(ctx, input);
  }

  private async setStock(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void> {
    this.assertConfigured();
    await this.request('PUT', '/stock/v1/inventory/update', ctx, {
      body: [{ guid: input.posProductId, status: 'QUANTITY', quantity: input.quantity }],
    });
  }

  async getSales(): Promise<POSSaleRecord[]> {
    this.assertConfigured();
    // Polling fallback; primary flow is the webhook below.
    throw AppError.badGateway('Real Toast getSales() polling is not implemented — rely on webhooks.', 'TOAST_NOT_IMPLEMENTED');
  }

  async verifyAndParseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    ctx: POSConnectionContext,
  ): Promise<NormalizedSaleEvent[]> {
    const payload = JSON.parse(rawBody.toString('utf8')) as {
      eventCategory?: string;
      timestamp?: string;
      details?: { restaurantGuid?: string; order?: { guid?: string } };
    };

    verifyToastSignature(rawBody, payload.timestamp, headers);
    logger.info('Received Toast webhook', { eventCategory: payload.eventCategory });

    if (payload.eventCategory !== 'order_updated') return [];
    const orderGuid = payload.details?.order?.guid;
    if (!orderGuid) return [];

    // Webhook body only has display names — fetch the full order for real item GUIDs.
    const order = await this.request<{
      guid: string;
      checks?: { selections?: { item?: { guid?: string }; quantity?: number }[] }[];
    }>('GET', `/orders/v2/orders/${orderGuid}`, ctx);

    const events: NormalizedSaleEvent[] = [];
    for (const check of order.checks ?? []) {
      for (const selection of check.selections ?? []) {
        if (!selection.item?.guid || !selection.quantity) continue;
        events.push({
          provider: 'toast',
          externalTransactionId: `${order.guid}:${selection.item.guid}`,
          posProductId: selection.item.guid,
          quantity: selection.quantity,
          locationId: payload.details?.restaurantGuid,
          occurredAt: payload.timestamp ? new Date(payload.timestamp) : new Date(),
          raw: order,
        });
      }
    }
    return events;
  }
}

// HMAC-SHA256 over (body + timestamp), base64, compared against Toast-Signature.
function verifyToastSignature(
  rawBody: Buffer,
  timestamp: string | undefined,
  headers: Record<string, string | string[] | undefined>,
): void {
  const secret = env.toast.webhookSecret;
  if (!secret) {
    logger.warn('TOAST_WEBHOOK_SECRET not set — skipping signature verification (dev only).');
    return;
  }
  if (!timestamp) {
    throw AppError.unauthorized('Toast webhook payload is missing a timestamp.', 'INVALID_SIGNATURE');
  }
  const signatureHeader = headers['toast-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!signature) {
    throw AppError.unauthorized('Missing Toast webhook signature.', 'INVALID_SIGNATURE');
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody.toString('utf8') + timestamp)
    .digest('base64');
  const valid = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    throw AppError.unauthorized('Invalid Toast webhook signature.', 'INVALID_SIGNATURE');
  }
}

export const toastProvider = new ToastProvider();
