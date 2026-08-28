import crypto from 'crypto';
import { ApiError } from 'square';
import { createSquareClient } from './square.client';
import { env } from '../../config/env';
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
import { SquareWebhookEnvelope } from './square.types';

// Real Square integration using the official Square Node SDK (v38-era API surface — verify
// against https://developer.squareup.com/reference/square if a newer major version is installed).
export class SquareProvider implements POSProvider {
  readonly providerName = 'square' as const;
  readonly mode = 'live' as const;

  async connect(ctx: POSConnectionContext): Promise<{ merchantId?: string; locationId?: string }> {
    if (!ctx.accessToken) {
      throw AppError.badRequest('Square access token is required to connect.', 'MISSING_CREDENTIALS');
    }
    const client = createSquareClient(ctx.accessToken);
    try {
      const response = await client.locationsApi.listLocations();
      const locations = response.result.locations ?? [];
      if (locations.length === 0) {
        throw AppError.badGateway('Square account has no locations to connect to.', 'NO_LOCATIONS');
      }
      const primary = locations[0];
      return { merchantId: primary.merchantId, locationId: primary.id };
    } catch (err) {
      throw translateSquareError(err, 'Failed to connect to Square');
    }
  }

  async disconnect(): Promise<void> {
    // Sandbox tokens need no remote revocation; OAuth tokens should call RevokeToken in production.
  }

  async getLocations(ctx: POSConnectionContext): Promise<POSLocation[]> {
    const client = requireClient(ctx);
    try {
      const response = await client.locationsApi.listLocations();
      return (response.result.locations ?? []).map((loc) => ({
        id: loc.id ?? '',
        name: loc.name ?? loc.id ?? 'Unnamed location',
        raw: loc,
      }));
    } catch (err) {
      throw translateSquareError(err, 'Failed to fetch Square locations');
    }
  }

  async createProduct(ctx: POSConnectionContext, input: CreateProductInput): Promise<POSProduct> {
    const client = requireClient(ctx);
    const idempotencyKey = crypto.randomUUID();
    try {
      const response = await client.catalogApi.upsertCatalogObject({
        idempotencyKey,
        object: {
          type: 'ITEM',
          id: `#${idempotencyKey}`,
          itemData: {
            name: input.name,
            description: input.description,
            variations: [
              {
                type: 'ITEM_VARIATION',
                id: `#${idempotencyKey}-variation`,
                itemVariationData: {
                  name: 'Regular',
                  // No price on our Product model, so use VARIABLE_PRICING when unset instead of a fake $0.
                  pricingType: input.price ? 'FIXED_PRICING' : 'VARIABLE_PRICING',
                  sku: input.sku,
                  priceMoney: input.price ? { amount: BigInt(input.price), currency: 'USD' } : undefined,
                  trackInventory: true,
                },
              },
            ],
          },
        },
      });
      const created = response.result.catalogObject;
      const variationId = created?.itemData?.variations?.[0]?.id ?? created?.id ?? '';
      return { id: variationId, name: input.name, sku: input.sku, price: input.price, raw: created };
    } catch (err) {
      throw translateSquareError(err, 'Failed to create Square catalog product');
    }
  }

  async getProducts(ctx: POSConnectionContext): Promise<POSProduct[]> {
    const client = requireClient(ctx);
    try {
      const response = await client.catalogApi.listCatalog(undefined, 'ITEM');
      const objects = response.result.objects ?? [];
      const products: POSProduct[] = [];
      for (const obj of objects) {
        const variation = obj.itemData?.variations?.[0];
        products.push({
          id: variation?.id ?? obj.id ?? '',
          name: obj.itemData?.name ?? 'Unnamed item',
          sku: variation?.itemVariationData?.sku ?? undefined,
          price: variation?.itemVariationData?.priceMoney?.amount
            ? Number(variation.itemVariationData.priceMoney.amount)
            : undefined,
          raw: obj,
        });
      }
      return products;
    } catch (err) {
      throw translateSquareError(err, 'Failed to fetch Square catalog products');
    }
  }

  async allocateInventory(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void> {
    await this.setInventoryCount(ctx, input);
  }

  async updateInventory(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void> {
    await this.setInventoryCount(ctx, input);
  }

  private async setInventoryCount(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void> {
    const client = requireClient(ctx);
    const locationId = input.locationId ?? ctx.locationId;
    if (!locationId) {
      throw AppError.badRequest('A Square location id is required to set inventory counts.', 'MISSING_LOCATION');
    }
    try {
      await client.inventoryApi.batchChangeInventory({
        idempotencyKey: crypto.randomUUID(),
        changes: [
          {
            type: 'PHYSICAL_COUNT',
            physicalCount: {
              catalogObjectId: input.posProductId,
              locationId,
              quantity: String(input.quantity),
              state: 'IN_STOCK',
              occurredAt: new Date().toISOString(),
            },
          },
        ],
      });
    } catch (err) {
      throw translateSquareError(err, 'Failed to set Square inventory count');
    }
  }

  // Creates a real Order + Payment against Square's sandbox (same mechanism as
  // scripts/square-test-sale.ts, exposed here so the UI can trigger it without a terminal).
  // Does NOT touch our inventory directly — depletion still only happens when Square's real
  // webhook for this order arrives, same as any other sale.
  async createTestSale(
    ctx: POSConnectionContext,
    input: { posProductId: string; locationId: string; quantity: number; unitPriceCents?: number },
  ): Promise<{ orderId: string; paymentId: string; paymentStatus?: string; totalMoney: string }> {
    const client = requireClient(ctx);
    try {
      const orderResponse = await client.ordersApi.createOrder({
        idempotencyKey: crypto.randomUUID(),
        order: {
          locationId: input.locationId,
          lineItems: [
            {
              catalogObjectId: input.posProductId,
              quantity: String(input.quantity),
              basePriceMoney: { amount: BigInt(input.unitPriceCents ?? 100), currency: 'USD' },
            },
          ],
        },
      });
      const order = orderResponse.result.order;
      if (!order?.id || !order.totalMoney) {
        throw AppError.badGateway('Square did not return a usable order.', 'SQUARE_API_ERROR');
      }

      const paymentResponse = await client.paymentsApi.createPayment({
        idempotencyKey: crypto.randomUUID(),
        sourceId: 'cnon:card-nonce-ok',
        orderId: order.id,
        amountMoney: order.totalMoney,
      });
      const payment = paymentResponse.result.payment;

      return {
        orderId: order.id,
        paymentId: payment?.id ?? '',
        paymentStatus: payment?.status,
        totalMoney: `${order.totalMoney.amount} ${order.totalMoney.currency}`,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw translateSquareError(err, 'Failed to create Square sandbox test sale');
    }
  }

  async getSales(ctx: POSConnectionContext, since?: Date): Promise<POSSaleRecord[]> {
    // Polling fallback; primary flow uses webhooks.
    const client = requireClient(ctx);
    const locationId = ctx.locationId;
    if (!locationId) return [];
    try {
      const response = await client.ordersApi.searchOrders({
        locationIds: [locationId],
        query: {
          filter: {
            dateTimeFilter: since
              ? { closedAt: { startAt: since.toISOString() } }
              : undefined,
            stateFilter: { states: ['COMPLETED'] },
          },
        },
      });
      const orders = response.result.orders ?? [];
      const records: POSSaleRecord[] = [];
      for (const order of orders) {
        for (const line of order.lineItems ?? []) {
          if (!line.catalogObjectId) continue;
          records.push({
            externalTransactionId: `${order.id}:${line.uid}`,
            posProductId: line.catalogObjectId,
            quantity: Number(line.quantity ?? '0'),
            locationId,
            occurredAt: order.closedAt ? new Date(order.closedAt) : new Date(),
            raw: order,
          });
        }
      }
      return records;
    } catch (err) {
      throw translateSquareError(err, 'Failed to fetch Square orders');
    }
  }

  async verifyAndParseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    ctx: POSConnectionContext,
  ): Promise<NormalizedSaleEvent[]> {
    verifySquareSignature(rawBody, headers);

    const envelope = JSON.parse(rawBody.toString('utf8')) as SquareWebhookEnvelope;
    logger.info('Received Square webhook', { type: envelope.type, eventId: envelope.event_id });

    // Order webhooks only carry a reference — line items are fetched separately below.
    if (envelope.type !== 'order.updated' && envelope.type !== 'order.created') {
      return [];
    }

    const orderId = envelope.data?.id;
    if (!orderId) return [];

    const client = requireClient(ctx);
    try {
      const response = await client.ordersApi.retrieveOrder(orderId);
      const order = response.result.order;
      if (!order || order.state !== 'COMPLETED') return [];

      const events: NormalizedSaleEvent[] = [];
      for (const line of order.lineItems ?? []) {
        if (!line.catalogObjectId) continue;
        events.push({
          provider: 'square',
          externalTransactionId: `${order.id}:${line.uid}`,
          posProductId: line.catalogObjectId,
          quantity: Number(line.quantity ?? '0'),
          locationId: order.locationId,
          occurredAt: order.closedAt ? new Date(order.closedAt) : new Date(),
          raw: order,
        });
      }
      return events;
    } catch (err) {
      throw translateSquareError(err, 'Failed to resolve Square order for webhook event');
    }
  }
}

function requireClient(ctx: POSConnectionContext) {
  if (!ctx.accessToken) {
    throw AppError.badRequest('Square connection is missing an access token.', 'MISSING_CREDENTIALS');
  }
  return createSquareClient(ctx.accessToken);
}

// HMAC-SHA256 of notificationUrl+rawBody, base64-encoded, per x-square-hmacsha256-signature header.
function verifySquareSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): void {
  const signatureKey = env.square.webhookSignatureKey;
  if (!signatureKey) {
    logger.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not set — skipping signature verification (dev only).');
    return;
  }
  const signatureHeader = headers['x-square-hmacsha256-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!signature) {
    throw AppError.unauthorized('Missing Square webhook signature.', 'INVALID_SIGNATURE');
  }
  const payload = env.square.webhookNotificationUrl + rawBody.toString('utf8');
  const expected = crypto.createHmac('sha256', signatureKey).update(payload).digest('base64');
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    throw AppError.unauthorized('Invalid Square webhook signature.', 'INVALID_SIGNATURE');
  }
}

function translateSquareError(err: unknown, message: string): AppError {
  if (err instanceof ApiError) {
    logger.error(message, { statusCode: err.statusCode, errors: err.result });
    return AppError.badGateway(`${message}: ${err.message}`, 'SQUARE_API_ERROR', err.result);
  }
  logger.error(message, { error: err instanceof Error ? err.message : err });
  return AppError.badGateway(message, 'SQUARE_API_ERROR');
}
