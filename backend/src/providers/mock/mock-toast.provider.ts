import crypto from 'crypto';
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

interface MockCatalogEntry extends POSProduct {
  allocatedQuantity: number;
}

// Simulated Toast integration behind the same POSProvider contract as SquareProvider. Never
// calls toasttab.com; `mode = 'mock'` is what the frontend renders as "Toast — Mock Mode".
export class MockToastProvider implements POSProvider {
  readonly providerName = 'toast' as const;
  readonly mode = 'mock' as const;

  // In-memory catalog per connectionId; the real inventory ledger stays in MongoDB.
  private catalogByConnection = new Map<string, Map<string, MockCatalogEntry>>();

  private catalogFor(connectionId: string): Map<string, MockCatalogEntry> {
    let catalog = this.catalogByConnection.get(connectionId);
    if (!catalog) {
      catalog = new Map();
      this.catalogByConnection.set(connectionId, catalog);
    }
    return catalog;
  }

  async connect(ctx: POSConnectionContext): Promise<{ merchantId?: string; locationId?: string }> {
    logger.info('MockToastProvider: simulated connect', { connectionId: ctx.connectionId });
    return {
      merchantId: `mock-restaurant-${ctx.connectionId.slice(-6)}`,
      locationId: `mock-location-${ctx.connectionId.slice(-6)}`,
    };
  }

  async disconnect(ctx: POSConnectionContext): Promise<void> {
    this.catalogByConnection.delete(ctx.connectionId);
  }

  async getLocations(ctx: POSConnectionContext): Promise<POSLocation[]> {
    return [
      {
        id: `mock-location-${ctx.connectionId.slice(-6)}`,
        name: 'Mock Toast Restaurant (Demo)',
      },
    ];
  }

  async createProduct(ctx: POSConnectionContext, input: CreateProductInput): Promise<POSProduct> {
    const catalog = this.catalogFor(ctx.connectionId);
    const id = `mock-toast-item-${crypto.randomUUID()}`;
    const product: MockCatalogEntry = {
      id,
      name: input.name,
      sku: input.sku,
      price: input.price,
      allocatedQuantity: 0,
    };
    catalog.set(id, product);
    return product;
  }

  async getProducts(ctx: POSConnectionContext): Promise<POSProduct[]> {
    return Array.from(this.catalogFor(ctx.connectionId).values());
  }

  async allocateInventory(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void> {
    const catalog = this.catalogFor(ctx.connectionId);
    const product = catalog.get(input.posProductId);
    if (!product) {
      throw AppError.notFound('Mock Toast product not found for allocation.', 'POS_PRODUCT_NOT_FOUND');
    }
    product.allocatedQuantity = input.quantity;
  }

  async updateInventory(ctx: POSConnectionContext, input: AllocateInventoryInput): Promise<void> {
    await this.allocateInventory(ctx, input);
  }

  async getSales(): Promise<POSSaleRecord[]> {
    return [];
  }

  // Not used by the live flow (Mock Toast Terminal posts to /api/sales/simulate directly);
  // kept for interface completeness.
  async verifyAndParseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<NormalizedSaleEvent[]> {
    const payload = JSON.parse(rawBody.toString('utf8')) as {
      externalTransactionId: string;
      posProductId: string;
      quantity: number;
      locationId?: string;
    };
    return [
      {
        provider: 'toast',
        externalTransactionId: payload.externalTransactionId,
        posProductId: payload.posProductId,
        quantity: payload.quantity,
        locationId: payload.locationId,
        occurredAt: new Date(),
        raw: payload,
      },
    ];
  }

  simulateSaleEvent(connectionId: string, posProductId: string, quantity: number): NormalizedSaleEvent {
    const catalog = this.catalogFor(connectionId);
    const product = catalog.get(posProductId);
    if (product) {
      product.allocatedQuantity = Math.max(0, product.allocatedQuantity - quantity);
    }
    return {
      provider: 'toast',
      externalTransactionId: `mock_toast_sale_${crypto.randomUUID()}`,
      posProductId,
      quantity,
      occurredAt: new Date(),
      raw: { simulated: true },
    };
  }
}

export const mockToastProvider = new MockToastProvider();
