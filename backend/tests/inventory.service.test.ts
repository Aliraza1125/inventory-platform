import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup';
import { inventoryService } from '../src/services/inventory.service';
import { AppError } from '../src/utils/AppError';

beforeAll(setupTestDatabase);
afterAll(teardownTestDatabase);
afterEach(clearTestDatabase);

describe('inventoryService.createProduct', () => {
  it('creates a product with the given quantity', async () => {
    const product = await inventoryService.createProduct({
      name: 'Coca Cola',
      sku: 'coke-001',
      quantity: 100,
      price: 250,
    });
    expect(product.name).toBe('Coca Cola');
    expect(product.sku).toBe('COKE-001'); // normalized to uppercase
    expect(product.quantity).toBe(100);
  });

  it('rejects a duplicate SKU', async () => {
    await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100, price: 250 });
    await expect(
      inventoryService.createProduct({ name: 'Coca Cola 2', sku: 'COKE-001', quantity: 5, price: 250 }),
    ).rejects.toMatchObject<Partial<AppError>>({ statusCode: 409, code: 'DUPLICATE_SKU' });
  });

  it('rejects a missing name or sku', async () => {
    await expect(inventoryService.createProduct({ name: '', sku: 'X' } as never)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('stores a price in minor currency units', async () => {
    const product = await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100, price: 250 });
    expect(product.price).toBe(250);
  });

  it('rejects a negative price', async () => {
    await expect(
      inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100, price: -1 }),
    ).rejects.toMatchObject<Partial<AppError>>({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('rejects a product created without a price', async () => {
    await expect(
      inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100 } as never),
    ).rejects.toMatchObject<Partial<AppError>>({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });
});

describe('inventoryService.listProducts', () => {
  it('reports allocatedQuantity and availableQuantity per product', async () => {
    const product = await inventoryService.createProduct({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100, price: 250 });
    const [listed] = await inventoryService.listProducts();
    expect(listed.allocatedQuantity).toBe(0);
    expect(listed.availableQuantity).toBe(100);
    expect(String(listed._id)).toBe(String(product._id));
  });
});
