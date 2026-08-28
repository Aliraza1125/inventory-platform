import { MockToastProvider } from '../src/providers/mock/mock-toast.provider';

describe('MockToastProvider — POSProvider adapter behavior', () => {
  it('reports mode "mock" so the UI never confuses it with a live integration', () => {
    const provider = new MockToastProvider();
    expect(provider.mode).toBe('mock');
    expect(provider.providerName).toBe('toast');
  });

  it('creates products and lists them back per-connection', async () => {
    const provider = new MockToastProvider();
    const ctx = { connectionId: 'conn-1' };

    const created = await provider.createProduct(ctx, { name: 'Coca Cola', sku: 'COKE-001' });
    const products = await provider.getProducts(ctx);

    expect(products).toHaveLength(1);
    expect(products[0].id).toBe(created.id);
    expect(products[0].name).toBe('Coca Cola');
  });

  it('isolates catalogs between different mock connections', async () => {
    const provider = new MockToastProvider();
    await provider.createProduct({ connectionId: 'conn-a' }, { name: 'A' });
    await provider.createProduct({ connectionId: 'conn-b' }, { name: 'B' });

    expect(await provider.getProducts({ connectionId: 'conn-a' })).toHaveLength(1);
    expect(await provider.getProducts({ connectionId: 'conn-b' })).toHaveLength(1);
  });

  it('allocateInventory sets the allocated quantity on the mock catalog entry', async () => {
    const provider = new MockToastProvider();
    const ctx = { connectionId: 'conn-1' };
    const product = await provider.createProduct(ctx, { name: 'Coca Cola' });

    await provider.allocateInventory(ctx, { posProductId: product.id, quantity: 50 });

    const [listed] = await provider.getProducts(ctx);
    expect((listed as { allocatedQuantity?: number }).allocatedQuantity).toBe(50);
  });

  it('simulateSaleEvent produces a NormalizedSaleEvent shaped like a real webhook would', async () => {
    const provider = new MockToastProvider();
    const ctx = { connectionId: 'conn-1' };
    const product = await provider.createProduct(ctx, { name: 'Coca Cola' });
    await provider.allocateInventory(ctx, { posProductId: product.id, quantity: 50 });

    const event = provider.simulateSaleEvent('conn-1', product.id, 2);

    expect(event.provider).toBe('toast');
    expect(event.posProductId).toBe(product.id);
    expect(event.quantity).toBe(2);
    expect(event.externalTransactionId).toMatch(/^mock_toast_sale_/);
  });
});
