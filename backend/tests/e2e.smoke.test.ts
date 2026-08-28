import request from 'supertest';
import crypto from 'crypto';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup';
import { createApp } from '../src/app';

const app = createApp();

beforeAll(setupTestDatabase);
afterAll(teardownTestDatabase);
afterEach(clearTestDatabase);

describe('End-to-end HTTP flow (full app wiring, not just services)', () => {
  it('walks the full demo flow: create product -> connect mock toast -> allocate -> simulate sale -> dashboard reflects it', async () => {
    const createRes = await request(app)
      .post('/api/inventory')
      .send({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100, price: 250 })
      .expect(201);
    const productId = createRes.body.data._id;
    expect(createRes.body.data.quantity).toBe(100);

    await request(app).post('/api/pos/toast/connect').expect(200);

    const connections = await request(app).get('/api/pos/connections').expect(200);
    const toastConn = connections.body.data.find((c: { provider: string }) => c.provider === 'toast');
    expect(toastConn.mode).toBe('mock'); // no TOAST_MODE=live configured in test env
    expect(toastConn.status).toBe('connected');

    const allocateRes = await request(app)
      .post('/api/allocations')
      .send({ productId, posProvider: 'toast', quantity: 50 })
      .expect(201);
    expect(allocateRes.body.data.allocatedQuantity).toBe(50);

    const saleRes = await request(app)
      .post('/api/sales/simulate')
      .send({ productId, posProvider: 'toast', quantity: 2 })
      .expect(201);
    expect(saleRes.body.data.status).toBe('processed');
    expect(saleRes.body.data.productQuantityAfter).toBe(98);
    expect(saleRes.body.data.allocationAfter).toBe(48);

    const productRes = await request(app).get(`/api/inventory/${productId}`).expect(200);
    expect(productRes.body.data.product.quantity).toBe(98);

    const dashboardRes = await request(app).get('/api/dashboard/summary').expect(200);
    expect(dashboardRes.body.data.totalInventory).toBe(98);
    expect(dashboardRes.body.data.connectedPOS).toContain('toast');
    expect(dashboardRes.body.data.recentSales.length).toBeGreaterThan(0);
  });

  it('rejects creating a product without a name with a 400 and a JSON error body', async () => {
    const res = await request(app).post('/api/inventory').send({ sku: 'X' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for an unknown product id with a helpful error code', async () => {
    const res = await request(app).get('/api/inventory/64b000000000000000000000').expect(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});

describe('POST /api/webhooks/toast — raw-body parsing + idempotency over real HTTP', () => {
  async function setupProductWithToastAllocation() {
    const createRes = await request(app)
      .post('/api/inventory')
      .send({ name: 'Coca Cola', sku: 'COKE-001', quantity: 100, price: 250 })
      .expect(201);
    const productId = createRes.body.data._id;

    await request(app).post('/api/pos/toast/connect').expect(200);
    const allocateRes = await request(app)
      .post('/api/allocations')
      .send({ productId, posProvider: 'toast', quantity: 50 })
      .expect(201);

    return { productId, posProductId: allocateRes.body.data.posProductId as string };
  }

  it('processes a webhook once and ignores an exact duplicate delivery', async () => {
    const { posProductId } = await setupProductWithToastAllocation();
    const externalTransactionId = `sale_${crypto.randomUUID()}`;
    const payload = { externalTransactionId, posProductId, quantity: 3 };

    const first = await request(app)
      .post('/api/webhooks/toast')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload))
      .expect(200);
    expect(first.body.results[0].status).toBe('processed');

    const second = await request(app)
      .post('/api/webhooks/toast')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload))
      .expect(200);
    expect(second.body.results[0].status).toBe('duplicate');

    const dashboardRes = await request(app).get('/api/dashboard/summary').expect(200);
    expect(dashboardRes.body.data.totalInventory).toBe(97); // decremented exactly once
  });
});
