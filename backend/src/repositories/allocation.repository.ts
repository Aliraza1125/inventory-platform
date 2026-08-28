import { Types } from 'mongoose';
import { InventoryAllocation } from '../models/InventoryAllocation';
import { POSProviderName } from '../models/POSConnection';

export const allocationRepository = {
  findAll() {
    return InventoryAllocation.find().populate('productId').sort({ createdAt: -1 });
  },

  findByProduct(productId: string) {
    return InventoryAllocation.find({ productId });
  },

  findOne(productId: string, posProvider: POSProviderName, posLocationId?: string) {
    return InventoryAllocation.findOne({ productId, posProvider, posLocationId: posLocationId ?? null });
  },

  findByPosProduct(posProvider: POSProviderName, posProductId: string) {
    return InventoryAllocation.findOne({ posProvider, posProductId });
  },

  /** Sets (not increments) the allocated quantity for a product/provider pair — creates if absent. */
  upsertAllocation(
    productId: string,
    posProvider: POSProviderName,
    posProductId: string,
    allocatedQuantity: number,
    posLocationId?: string,
  ) {
    return InventoryAllocation.findOneAndUpdate(
      { productId, posProvider, posLocationId: posLocationId ?? null },
      { $set: { posProductId, allocatedQuantity, posLocationId: posLocationId ?? null } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  },

  // Atomic clamped-at-zero decrement via aggregation pipeline (no read-modify-write race).
  // Targets a known allocation by _id — see README "Inventory Allocation Logic".
  decrementClampedById(allocationId: string, amount: number) {
    return InventoryAllocation.findByIdAndUpdate(
      allocationId,
      [
        {
          $set: {
            allocatedQuantity: {
              $max: [0, { $subtract: ['$allocatedQuantity', amount] }],
            },
          },
        },
      ],
      { new: true },
    );
  },

  sumAllocatedForProduct(productId: string) {
    return InventoryAllocation.aggregate<{ _id: null; total: number }>([
      { $match: { productId: new Types.ObjectId(productId) } },
      { $group: { _id: null, total: { $sum: '$allocatedQuantity' } } },
    ]).then((rows) => rows[0]?.total ?? 0);
  },
};
