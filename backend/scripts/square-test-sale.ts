// Triggers a real sale on Square's Sandbox (outside this platform's own UI/API), which fires
// a real signed webhook back to POST /api/webhooks/square.
//
// Usage: npx ts-node scripts/square-test-sale.ts --variationId=<id> --locationId=<id> --quantity=2
// --variationId comes from a product's "POS Allocations" table on its Product Detail page.
import { randomUUID } from 'crypto';
import { createSquareClient } from '../src/providers/square/square.client';
import { env } from '../src/config/env';

function parseArgs(): { variationId: string; locationId: string; quantity: number; unitPriceCents: number } {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, '').split('=');
      return [key, value];
    }),
  );
  if (!args.variationId || !args.locationId) {
    console.error(
      'Usage: ts-node scripts/square-test-sale.ts --variationId=<id> --locationId=<id> [--quantity=2] [--unitPriceCents=100]',
    );
    process.exit(1);
  }
  return {
    variationId: args.variationId,
    locationId: args.locationId,
    quantity: Number(args.quantity ?? '2'),
    // VARIABLE_PRICING items need an explicit line-item price; defaults to $1.00/unit.
    unitPriceCents: Number(args.unitPriceCents ?? '100'),
  };
}

async function main() {
  if (!env.square.accessToken) {
    console.error('SQUARE_ACCESS_TOKEN is not set in backend/.env — cannot call the Square Sandbox API.');
    process.exit(1);
  }

  const { variationId, locationId, quantity, unitPriceCents } = parseArgs();
  const client = createSquareClient(env.square.accessToken);

  console.log(`Creating a real Square Sandbox order: ${quantity} x ${variationId} at location ${locationId} ...`);
  const orderResponse = await client.ordersApi.createOrder({
    idempotencyKey: randomUUID(),
    order: {
      locationId,
      lineItems: [
        {
          catalogObjectId: variationId,
          quantity: String(quantity),
          basePriceMoney: { amount: BigInt(unitPriceCents), currency: 'USD' },
        },
      ],
    },
  });
  const order = orderResponse.result.order;
  if (!order?.id || !order.totalMoney) {
    throw new Error('Square did not return a usable order — check the variationId/locationId are correct.');
  }
  console.log(`Order created: ${order.id} — total ${order.totalMoney.amount} ${order.totalMoney.currency}`);

  console.log('Paying the order with the Sandbox test nonce cnon:card-nonce-ok ...');
  const paymentResponse = await client.paymentsApi.createPayment({
    idempotencyKey: randomUUID(),
    sourceId: 'cnon:card-nonce-ok',
    orderId: order.id,
    amountMoney: order.totalMoney,
  });
  const payment = paymentResponse.result.payment;
  console.log(`Payment ${payment?.status}: ${payment?.id}`);
  console.log(
    'If your webhook subscription + tunnel are set up, Square should now deliver an order.updated ' +
      'event to your backend and the platform should show the inventory depletion automatically.',
  );
}

main().catch((err) => {
  console.error('Square test sale failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
