import { productRepository } from '../repositories/product.repository';
import { allocationRepository } from '../repositories/allocation.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { AppError } from '../utils/AppError';

export interface CreateProductDTO {
  name: string;
  sku: string;
  description?: string;
  quantity?: number;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
}

export const inventoryService = {
  async createProduct(dto: CreateProductDTO) {
    if (!dto.name?.trim() || !dto.sku?.trim()) {
      throw AppError.badRequest('Product name and SKU are required.', 'VALIDATION_ERROR');
    }
    const existing = await productRepository.findBySku(dto.sku);
    if (existing) {
      throw AppError.conflict(`A product with SKU "${dto.sku.toUpperCase()}" already exists.`, 'DUPLICATE_SKU');
    }
    return productRepository.create({
      name: dto.name.trim(),
      sku: dto.sku.trim().toUpperCase(),
      description: dto.description?.trim() ?? '',
      quantity: dto.quantity ?? 0,
    });
  },

  async listProducts() {
    const products = await productRepository.findAll();
    const withAllocations = await Promise.all(
      products.map(async (product) => {
        const allocated = await allocationRepository.sumAllocatedForProduct(String(product._id));
        return {
          ...product.toObject(),
          allocatedQuantity: allocated,
          availableQuantity: Math.max(0, product.quantity - allocated),
        };
      }),
    );
    return withAllocations;
  },

  async getProduct(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw AppError.notFound('Product not found.', 'PRODUCT_NOT_FOUND');
    }
    const allocations = await allocationRepository.findByProduct(id);
    const transactions = await transactionRepository.findByProduct(id);
    const allocated = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0);
    return {
      product: {
        ...product.toObject(),
        allocatedQuantity: allocated,
        availableQuantity: Math.max(0, product.quantity - allocated),
      },
      allocations,
      transactions,
    };
  },

  async updateProduct(id: string, dto: UpdateProductDTO) {
    const product = await productRepository.updateById(id, dto);
    if (!product) {
      throw AppError.notFound('Product not found.', 'PRODUCT_NOT_FOUND');
    }
    return product;
  },

  async deleteProduct(id: string) {
    const product = await productRepository.deleteById(id);
    if (!product) {
      throw AppError.notFound('Product not found.', 'PRODUCT_NOT_FOUND');
    }
  },

  async restock(id: string, amount: number) {
    if (amount <= 0) {
      throw AppError.badRequest('Restock amount must be positive.', 'VALIDATION_ERROR');
    }
    const product = await productRepository.incrementQuantity(id, amount);
    if (!product) {
      throw AppError.notFound('Product not found.', 'PRODUCT_NOT_FOUND');
    }
    await transactionRepository.create({
      provider: 'manual',
      externalTransactionId: `restock_${id}_${Date.now()}`,
      productId: product._id,
      quantity: amount,
      type: 'RESTOCK',
      source: 'manual',
      status: 'COMPLETED',
      processedAt: new Date(),
      idempotencyKey: `manual-restock-${product._id}-${Date.now()}`,
    });
    return product;
  },

  async dashboardSummary() {
    const [totalProducts, totalInventory] = await Promise.all([
      productRepository.countAll(),
      productRepository.sumQuantity(),
    ]);
    return { totalProducts, totalInventory };
  },
};
