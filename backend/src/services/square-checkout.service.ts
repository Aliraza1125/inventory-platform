import { productRepository } from '../repositories/product.repository';
import { allocationRepository } from '../repositories/allocation.repository';
import { posConnectionRepository } from '../repositories/posConnection.repository';
import { SquareProvider } from '../providers/square/square.provider';
import { AppError } from '../utils/AppError';

const squareProvider = new SquareProvider();

export interface SquareCheckoutDTO {
  productId: string;
  quantity: number;
}

export interface SquareCheckoutResult {
  orderId: string;
  paymentId: string;
  paymentStatus?: string;
  totalMoney: string;
  productName: string;
}

// Represents a customer buying on Square's storefront — a real Order + Payment is created
// against Square's sandbox. Inventory is deliberately NOT touched here; it only depletes once
// Square's real webhook for this order arrives, exactly like any other Square sale.
export const squareCheckoutService = {
  async buy(dto: SquareCheckoutDTO): Promise<SquareCheckoutResult> {
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw AppError.badRequest('Quantity must be a positive number.', 'VALIDATION_ERROR');
    }

    const product = await productRepository.findById(dto.productId);
    if (!product) {
      throw AppError.notFound('Product not found.', 'PRODUCT_NOT_FOUND');
    }

    const connection = await posConnectionRepository.findByProviderWithSecrets('square');
    if (!connection || connection.status !== 'connected') {
      throw AppError.badRequest('Square is not connected.', 'POS_NOT_CONNECTED');
    }

    const allocation = await allocationRepository.findOne(dto.productId, 'square', connection.locationId);
    if (!allocation) {
      throw AppError.badRequest(
        `"${product.name}" has no allocation on Square. Allocate it before checkout.`,
        'NO_ALLOCATION',
      );
    }
    if (dto.quantity > allocation.allocatedQuantity) {
      throw AppError.badRequest(
        `Only ${allocation.allocatedQuantity} units of "${product.name}" are available on Square.`,
        'INSUFFICIENT_ALLOCATION',
      );
    }

    const result = await squareProvider.createTestSale(
      { connectionId: String(connection._id), accessToken: connection.accessToken, locationId: connection.locationId },
      {
        posProductId: allocation.posProductId,
        locationId: connection.locationId!,
        quantity: dto.quantity,
        unitPriceCents: product.price,
      },
    );

    return { ...result, productName: product.name };
  },
};
