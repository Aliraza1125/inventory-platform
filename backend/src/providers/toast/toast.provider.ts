import crypto from 'crypto';
import { env, isToastLive } from '../../config/env';
import { AppError } from '../../utils/AppError';
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

// Real Toast integration skeleton — not verified against live Toast responses (no dev account
// available; see README). Every method throws rather than guessing at request/response shapes.
// Swap in via ProviderFactory once TOAST_MODE=live and credentials are verified.
export class ToastProvider implements POSProvider {
  readonly providerName = 'toast' as const;
  readonly mode = 'live' as const;

  private assertConfigured(): void {
    if (!isToastLive()) {
      throw AppError.badRequest(
        'Real Toast integration is not configured. Set TOAST_MODE=live with TOAST_ACCESS_TOKEN ' +
          'and TOAST_RESTAURANT_GUID, or use Mock Toast for the demo.',
        'TOAST_NOT_CONFIGURED',
      );
    }
  }

  async connect(): Promise<{ merchantId?: string; locationId?: string }> {
    this.assertConfigured();
    throw AppError.badGateway(
      'Real Toast connect() is not implemented — verify Toast auth API before enabling TOAST_MODE=live.',
      'TOAST_NOT_IMPLEMENTED',
    );
  }

  async disconnect(): Promise<void> {
    this.assertConfigured();
  }

  async getLocations(): Promise<POSLocation[]> {
    this.assertConfigured();
    throw AppError.badGateway('Real Toast getLocations() is not implemented.', 'TOAST_NOT_IMPLEMENTED');
  }

  async createProduct(_ctx: POSConnectionContext, _input: CreateProductInput): Promise<POSProduct> {
    this.assertConfigured();
    throw AppError.badGateway('Real Toast createProduct() is not implemented.', 'TOAST_NOT_IMPLEMENTED');
  }

  async getProducts(): Promise<POSProduct[]> {
    this.assertConfigured();
    throw AppError.badGateway('Real Toast getProducts() is not implemented.', 'TOAST_NOT_IMPLEMENTED');
  }

  async allocateInventory(_ctx: POSConnectionContext, _input: AllocateInventoryInput): Promise<void> {
    this.assertConfigured();
    throw AppError.badGateway('Real Toast allocateInventory() is not implemented.', 'TOAST_NOT_IMPLEMENTED');
  }

  async updateInventory(_ctx: POSConnectionContext, _input: AllocateInventoryInput): Promise<void> {
    this.assertConfigured();
    throw AppError.badGateway('Real Toast updateInventory() is not implemented.', 'TOAST_NOT_IMPLEMENTED');
  }

  async getSales(): Promise<POSSaleRecord[]> {
    this.assertConfigured();
    throw AppError.badGateway('Real Toast getSales() is not implemented.', 'TOAST_NOT_IMPLEMENTED');
  }

  async verifyAndParseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<NormalizedSaleEvent[]> {
    // HMAC scheme mirrors Square's; exact header name/signing must be verified against Toast docs.
    const secret = env.toast.webhookSecret;
    if (secret) {
      const signatureHeader = headers['toast-webhook-signature'];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
      if (!signature || signature !== expected) {
        throw AppError.unauthorized('Invalid Toast webhook signature.', 'INVALID_SIGNATURE');
      }
    }
    throw AppError.badGateway(
      'Real Toast webhook payload parsing is not implemented — verify Toast order webhook schema first.',
      'TOAST_NOT_IMPLEMENTED',
    );
  }
}

export const toastProvider = new ToastProvider();
