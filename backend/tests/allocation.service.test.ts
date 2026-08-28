import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup';
import { inventoryService } from '../src/services/inventory.service';
import { allocationService } from '../src/services/allocation.service';
import { posConnectionRepository } from '../src/repositories/posConnection.repository';
import { AppError } from '../src/utils/AppError';

beforeAll(setupTestDatabase);
afterAll(teardownTestDatabase);
afterEach(clearTestDatabase);

async function connectMockToast() {
  return posConnectionRepository.upsertConnected('toast', {
    mode: 'mock',
    merchantId: 'mock-merchant',
    locationId: 'mock-location',
  });
}

describe('allocationService.allocate', () => {
  it('creates a POS catalog product and records the allocation', async () => {
    await connectMockToast();
    const product = await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100 });

    const allocation = await allocationService.allocate({
      productId: String(product._id),
      posProvider: 'toast',
      quantity: 50,
    });

    expect(allocation.allocatedQuantity).toBe(50);
    expect(allocation.posProductId).toMatch(/^mock-toast-item-/);
  });

  it('rejects allocating more than total stock', async () => {
    await connectMockToast();
    const product = await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 10 });

    await expect(
      allocationService.allocate({ productId: String(product._id), posProvider: 'toast', quantity: 50 }),
    ).rejects.toMatchObject<Partial<AppError>>({ statusCode: 400, code: 'ALLOCATION_EXCEEDS_STOCK' });
  });

  it('rejects allocating to a POS that is not connected', async () => {
    const product = await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 10 });

    await expect(
      allocationService.allocate({ productId: String(product._id), posProvider: 'toast', quantity: 5 }),
    ).rejects.toMatchObject<Partial<AppError>>({ statusCode: 400, code: 'POS_NOT_CONNECTED' });
  });

  it('reuses the existing POS product id on a second allocation to the same provider', async () => {
    await connectMockToast();
    const product = await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100 });

    const first = await allocationService.allocate({
      productId: String(product._id),
      posProvider: 'toast',
      quantity: 20,
    });
    const second = await allocationService.allocate({
      productId: String(product._id),
      posProvider: 'toast',
      quantity: 35,
    });

    expect(second.posProductId).toBe(first.posProductId);
    expect(second.allocatedQuantity).toBe(35);
  });
});
