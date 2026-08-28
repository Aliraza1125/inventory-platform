import { InventoryTransaction } from '../models/InventoryTransaction';

export const transactionRepository = {
  findAll(limit = 100) {
    return InventoryTransaction.find().populate('productId').sort({ createdAt: -1 }).limit(limit);
  },

  findByProduct(productId: string) {
    return InventoryTransaction.find({ productId }).sort({ createdAt: -1 });
  },

  findByIdempotencyKey(idempotencyKey: string) {
    return InventoryTransaction.findOne({ idempotencyKey });
  },

  create(data: Partial<InstanceType<typeof InventoryTransaction>>) {
    return InventoryTransaction.create(data);
  },

  countRecentSales(since: Date) {
    return InventoryTransaction.countDocuments({ type: 'SALE', status: 'COMPLETED', createdAt: { $gte: since } });
  },
};
