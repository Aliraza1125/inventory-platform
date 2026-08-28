import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup';
import { inventoryService } from '../src/services/inventory.service';
import { allocationService } from '../src/services/allocation.service';
import { salesService } from '../src/services/sales.service';
import { posConnectionRepository } from '../src/repositories/posConnection.repository';
import { Product } from '../src/models/Product';
import { InventoryAllocation } from '../src/models/InventoryAllocation';

beforeAll(setupTestDatabase);
afterAll(teardownTestDatabase);
afterEach(clearTestDatabase);

describe('salesService.simulateSale', () => {
  it('drives the same inventory logic a real webhook would, end to end', async () => {
    await posConnectionRepository.upsertConnected('toast', { mode: 'mock', locationId: 'mock-location' });
    const product = await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100 });
    await allocationService.allocate({ productId: String(product._id), posProvider: 'toast', quantity: 50 });

    const result = await salesService.simulateSale({
      productId: String(product._id),
      posProvider: 'toast',
      quantity: 2,
    });

    expect(result.status).toBe('processed');
    expect(result.productQuantityAfter).toBe(98);
    expect(result.allocationAfter).toBe(48);

    const reloadedProduct = await Product.findById(product._id);
    const reloadedAllocation = await InventoryAllocation.findOne({ productId: product._id, posProvider: 'toast' });
    expect(reloadedProduct?.quantity).toBe(98);
    expect(reloadedAllocation?.allocatedQuantity).toBe(48);
  });

  it('rejects simulating a sale for a product with no allocation on that POS', async () => {
    await posConnectionRepository.upsertConnected('toast', { mode: 'mock', locationId: 'mock-location' });
    const product = await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100 });

    await expect(
      salesService.simulateSale({ productId: String(product._id), posProvider: 'toast', quantity: 2 }),
    ).rejects.toMatchObject({ code: 'NO_ALLOCATION' });
  });

  it('refuses to simulate a sale for Square, since Square is a live provider and must use real webhooks', async () => {
    const product = await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100 });

    await expect(
      salesService.simulateSale({ productId: String(product._id), posProvider: 'square', quantity: 2 }),
    ).rejects.toMatchObject({ code: 'SIMULATION_NOT_ALLOWED_FOR_LIVE_PROVIDER' });
  });
});
