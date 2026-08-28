import { productRepository } from '../repositories/product.repository';
import { posConnectionRepository } from '../repositories/posConnection.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { InventoryTransaction } from '../models/InventoryTransaction';

export const dashboardService = {
  async summary() {
    const [totalProducts, totalInventory, connections, recentSales] = await Promise.all([
      productRepository.countAll(),
      productRepository.sumQuantity(),
      posConnectionRepository.findAll(),
      InventoryTransaction.find().populate('productId').sort({ createdAt: -1 }).limit(10),
    ]);

    const connectedProviders = connections.filter((c) => c.status === 'connected').map((c) => c.provider);

    return {
      totalProducts,
      totalInventory,
      connectedPOS: connectedProviders,
      recentSales,
    };
  },

  async recentTransactions(limit = 20) {
    return transactionRepository.findAll(limit);
  },
};
