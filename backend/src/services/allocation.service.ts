import { productRepository } from '../repositories/product.repository';
import { allocationRepository } from '../repositories/allocation.repository';
import { posConnectionRepository } from '../repositories/posConnection.repository';
import { ProviderFactory } from '../providers/provider.factory';
import { POSProviderName } from '../models/POSConnection';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export interface AllocateDTO {
  productId: string;
  posProvider: POSProviderName;
  quantity: number;
  posProductId?: string; // pass an existing POS catalog id to reuse instead of creating a new one
}

// Allocation = how much of a product's total quantity is exposed to a POS channel, not a
// separate reserved pool. See README "Inventory Allocation Logic".
export const allocationService = {
  async allocate(dto: AllocateDTO) {
    if (dto.quantity < 0) {
      throw AppError.badRequest('Allocated quantity cannot be negative.', 'VALIDATION_ERROR');
    }
    const product = await productRepository.findById(dto.productId);
    if (!product) {
      throw AppError.notFound('Product not found.', 'PRODUCT_NOT_FOUND');
    }
    if (dto.quantity > product.quantity) {
      throw AppError.badRequest(
        `Cannot allocate ${dto.quantity} units — product only has ${product.quantity} in total stock.`,
        'ALLOCATION_EXCEEDS_STOCK',
      );
    }
    const connection = await posConnectionRepository.findByProviderWithSecrets(dto.posProvider);
    if (!connection || connection.status !== 'connected') {
      throw AppError.badRequest(
        `${dto.posProvider} is not connected. Connect it before allocating inventory.`,
        'POS_NOT_CONNECTED',
      );
    }

    const provider = ProviderFactory.get(dto.posProvider);
    const ctx = {
      connectionId: String(connection._id),
      accessToken: connection.accessToken,
      locationId: connection.locationId,
      metadata: connection.metadata,
    };

    let posProductId = dto.posProductId;
    const existing = await allocationRepository.findOne(dto.productId, dto.posProvider, connection.locationId);
    if (!posProductId) {
      posProductId = existing?.posProductId;
    }
    if (!posProductId) {
      const created = await provider.createProduct(ctx, {
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: product.price,
      });
      posProductId = created.id;
      logger.info('Created POS catalog product', { provider: dto.posProvider, posProductId });
    }

    await provider.allocateInventory(ctx, { posProductId, quantity: dto.quantity, locationId: connection.locationId });

    const allocation = await allocationRepository.upsertAllocation(
      dto.productId,
      dto.posProvider,
      posProductId,
      dto.quantity,
      connection.locationId,
    );
    return allocation;
  },

  async listAllocations() {
    return allocationRepository.findAll();
  },
};
