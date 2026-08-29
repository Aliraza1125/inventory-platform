// Seeds demo data via the running backend's own HTTP API (not direct service calls).
// Run: npm run dev (one terminal), then npm run seed (another).
import { env } from '../config/env';
import { logger } from '../utils/logger';

const BASE_URL = `http://localhost:${env.port}/api`;

const DEMO_PRODUCTS = [
  { name: 'Coca Cola', sku: 'COKE-001', description: '12oz can', quantity: 100, price: 250 },
  { name: 'Sparkling Water', sku: 'SPARK-002', description: '16oz bottle', quantity: 60, price: 300 },
  { name: 'Cheeseburger', sku: 'BURGER-003', description: 'House cheeseburger', quantity: 40, price: 650 },
];

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null;
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} -> ${res.status}: ${body?.error?.message ?? 'unknown error'}`);
  }
  return body?.data as T;
}

async function main() {
  logger.info(`Seeding via running API at ${BASE_URL} ...`);
  try {
    await fetch(`http://localhost:${env.port}/health`);
  } catch {
    logger.error(`Could not reach the backend at ${BASE_URL}. Start it first with "npm run dev".`);
    process.exit(1);
  }

  const products: { _id: string; sku: string }[] = [];
  for (const dto of DEMO_PRODUCTS) {
    const product = await call<{ _id: string; sku: string }>('/inventory', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    products.push(product);
    logger.info(`Created product ${dto.name} (${dto.sku}): ${dto.quantity} units`);
  }
  const coke = products.find((p) => p.sku === 'COKE-001')!;

  if (env.square.accessToken) {
    logger.info('SQUARE_ACCESS_TOKEN found — connecting real Square sandbox...');
    try {
      await call('/pos/square/connect', { method: 'POST' });
    } catch (err) {
      logger.warn('Square connect failed during seed (continuing without it)', {
        error: err instanceof Error ? err.message : err,
      });
    }
  } else {
    logger.info('No SQUARE_ACCESS_TOKEN set — skipping Square connection. Connect it from the UI once you have one.');
  }

  const connections = await call<{ provider: string; status: string }[]>('/pos/connections');
  if (connections.find((c) => c.provider === 'square' && c.status === 'connected')) {
    logger.info('Allocating inventory to Square...');
    await call('/allocations', {
      method: 'POST',
      body: JSON.stringify({ productId: coke._id, posProvider: 'square', quantity: 30 }),
    });
  }

  logger.info('Seed complete. Open the frontend and visit Inventory / POS Connections.');
}

main().catch((err) => {
  logger.error('Seed failed', { error: err instanceof Error ? err.message : err });
  process.exit(1);
});
