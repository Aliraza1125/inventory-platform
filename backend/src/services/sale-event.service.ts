import { NormalizedSaleEvent } from '../providers/pos-provider.interface';
import { productRepository } from '../repositories/product.repository';
import { allocationRepository } from '../repositories/allocation.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { InventoryTransaction, IInventoryTransaction } from '../models/InventoryTransaction';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export interface SaleProcessingResult {
  status: 'processed' | 'duplicate';
  transaction: IInventoryTransaction;
  productQuantityBefore?: number;
  productQuantityAfter?: number;
  allocationBefore?: number;
  allocationAfter?: number;
}

const MONGO_DUPLICATE_KEY_ERROR = 11000;

// Single code path for turning a POS sale (webhook or simulate) into inventory changes.
// Idempotent via a unique index on idempotencyKey; atomic via conditional decrements (see README).
export async function processSaleEvent(
  event: NormalizedSaleEvent,
  source: 'webhook' | 'simulation',
): Promise<SaleProcessingResult> {
  if (event.quantity <= 0) {
    throw AppError.badRequest('Sale quantity must be positive.', 'VALIDATION_ERROR');
  }

  const idempotencyKey = `${event.provider}:${event.externalTransactionId}`;

  const existing = await transactionRepository.findByIdempotencyKey(idempotencyKey);
  if (existing) {
    logger.info('Duplicate POS sale event ignored', { idempotencyKey });
    return { status: 'duplicate', transaction: existing };
  }

  const allocation = await allocationRepository.findByPosProduct(event.provider, event.posProductId);
  if (!allocation) {
    // Record the attempt without touching stock for an unidentified product.
    const failed = await safeInsertTransaction({
      provider: event.provider,
      externalTransactionId: event.externalTransactionId,
      quantity: event.quantity,
      type: 'SALE',
      source,
      status: 'FAILED',
      processedAt: event.occurredAt,
      idempotencyKey,
      errorMessage: `No allocation mapping found for ${event.provider} product ${event.posProductId}.`,
      metadata: { raw: event.raw },
    });
    if (failed.status === 'duplicate') return failed;
    throw AppError.unprocessable(
      `Received a sale for an unmapped ${event.provider} product (${event.posProductId}). No inventory was changed.`,
      'UNMAPPED_POS_PRODUCT',
    );
  }

  const productId = String(allocation.productId);
  const before = await productRepository.findById(productId);
  if (!before) {
    throw AppError.notFound('Mapped product no longer exists.', 'PRODUCT_NOT_FOUND');
  }

  const updatedProduct = await productRepository.decrementIfAvailable(productId, event.quantity);
  if (!updatedProduct) {
    const failed = await safeInsertTransaction({
      provider: event.provider,
      externalTransactionId: event.externalTransactionId,
      productId: before._id,
      quantity: event.quantity,
      type: 'SALE',
      source,
      status: 'FAILED',
      processedAt: event.occurredAt,
      idempotencyKey,
      errorMessage: `Insufficient inventory: had ${before.quantity}, sale requested ${event.quantity}.`,
      metadata: { raw: event.raw },
    });
    if (failed.status === 'duplicate') return failed;
    throw AppError.conflict(
      `Insufficient inventory for "${before.name}": had ${before.quantity}, sale requested ${event.quantity}.`,
      'INSUFFICIENT_INVENTORY',
    );
  }

  const allocationBefore = allocation.allocatedQuantity;
  const updatedAllocation = await allocationRepository.decrementClampedById(String(allocation._id), event.quantity);

  const inserted = await safeInsertTransaction({
    provider: event.provider,
    externalTransactionId: event.externalTransactionId,
    productId: before._id,
    quantity: event.quantity,
    type: 'SALE',
    source,
    status: 'COMPLETED',
    processedAt: event.occurredAt,
    idempotencyKey,
    metadata: { raw: event.raw },
  });

  if (inserted.status === 'duplicate') {
    // Rare race: both requests passed the existence check, so we've already double-decremented.
    logger.warn('Duplicate transaction detected after inventory was already decremented', { idempotencyKey });
  }

  return {
    status: 'processed',
    transaction: inserted.transaction,
    productQuantityBefore: before.quantity,
    productQuantityAfter: updatedProduct.quantity,
    allocationBefore,
    allocationAfter: updatedAllocation?.allocatedQuantity ?? allocationBefore,
  };
}

async function safeInsertTransaction(
  data: Partial<IInventoryTransaction>,
): Promise<{ status: 'processed' | 'duplicate'; transaction: IInventoryTransaction }> {
  try {
    const transaction = await InventoryTransaction.create(data);
    return { status: 'processed', transaction };
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      const existing = await transactionRepository.findByIdempotencyKey(data.idempotencyKey as string);
      if (existing) return { status: 'duplicate', transaction: existing };
    }
    throw err;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR;
}
