import { useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '@/utilities/errorMessage';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchProducts, selectProducts } from '@/redux/inventorySlice';
import { fetchAllocations, selectAllocations, squareCheckoutThunk } from '@/redux/posSlice';
import { notify } from '@/redux/notificationsSlice';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import type { Product, SquareCheckoutResult } from '@/types';

interface StoreItem {
  product: Product;
  priceCents: number;
  availableOnSquare: number;
}

type OrderStage = 'placing' | 'awaiting-webhook' | 'confirmed' | 'delayed';

interface OrderState {
  item: StoreItem;
  quantity: number;
  quantityBefore: number;
  stage: OrderStage;
  result?: SquareCheckoutResult;
}

const POLL_INTERVAL_MS = 3000;
const POLL_ATTEMPTS = 10;

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function Checkout() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const allocations = useAppSelector(selectAllocations);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reviewing, setReviewing] = useState<StoreItem | null>(null);
  const [order, setOrder] = useState<OrderState | null>(null);
  const pollRef = useRef<{ timer?: ReturnType<typeof setInterval>; attempts: number }>({ attempts: 0 });

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchAllocations());
  }, [dispatch]);

  useEffect(() => stopPolling, []);

  // Only lists products allocated to Square — every product carries a real price from creation,
  // so no separate pricing gate is needed here.
  const storeItems: StoreItem[] = useMemo(() => {
    return products
      .map((product) => {
        const squareAllocation = allocations.find(
          (a) => a.posProvider === 'square' && (typeof a.productId === 'string' ? a.productId : a.productId._id) === product._id,
        );
        return { product, priceCents: product.price, availableOnSquare: squareAllocation?.allocatedQuantity ?? 0 };
      })
      .filter((item) => item.availableOnSquare > 0);
  }, [products, allocations]);

  function quantityFor(productId: string) {
    return quantities[productId] ?? 1;
  }

  function setQuantity(productId: string, value: number, max: number) {
    setQuantities((prev) => ({ ...prev, [productId]: Math.min(Math.max(1, value), max) }));
  }

  function stopPolling() {
    if (pollRef.current.timer) clearInterval(pollRef.current.timer);
    pollRef.current = { attempts: 0 };
  }

  async function placeOrder() {
    if (!reviewing) return;
    const item = reviewing;
    const quantity = quantityFor(item.product._id);
    setReviewing(null);
    stopPolling();
    setOrder({ item, quantity, quantityBefore: item.product.quantity, stage: 'placing' });

    try {
      const result = await dispatch(squareCheckoutThunk({ productId: item.product._id, quantity })).unwrap();
      setOrder((prev) => (prev ? { ...prev, stage: 'awaiting-webhook', result } : prev));
      dispatch(notify(`Order placed on Square — ${result.totalMoney}`, 'success'));
      startPolling(item.product._id, item.product.quantity);
    } catch (err) {
      dispatch(notify(errorMessage(err), 'error'));
      setOrder(null);
    }
  }

  function startPolling(productId: string, quantityBefore: number) {
    pollRef.current.attempts = 0;
    pollRef.current.timer = setInterval(async () => {
      pollRef.current.attempts += 1;
      const fresh = await dispatch(fetchProducts()).unwrap();
      dispatch(fetchAllocations());
      const updated = fresh.find((p) => p._id === productId);
      if (updated && updated.quantity !== quantityBefore) {
        setOrder((prev) => (prev ? { ...prev, stage: 'confirmed' } : prev));
        stopPolling();
      } else if (pollRef.current.attempts >= POLL_ATTEMPTS) {
        setOrder((prev) => (prev ? { ...prev, stage: 'delayed' } : prev));
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  const orderProduct = order ? products.find((p) => p._id === order.item.product._id) : undefined;

  return (
    <div>
      <PageHeader
        title="Store"
        description="A storefront standing in for a customer buying on Square. Placing an order here creates a real Order + Payment on Square's sandbox — inventory only updates once Square's own webhook confirms it back to this platform."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {storeItems.map((item) => (
          <StoreCard
            key={item.product._id}
            item={item}
            quantity={quantityFor(item.product._id)}
            onQuantityChange={(v) => setQuantity(item.product._id, v, item.availableOnSquare)}
            onBuy={() => setReviewing(item)}
          />
        ))}
        {storeItems.length === 0 && (
          <p className="col-span-full rounded-xl border border-line bg-surface p-10 text-center text-sm text-ink-faint">
            Nothing allocated to Square yet — allocate a product to Square from the Inventory page first.
          </p>
        )}
      </div>

      {reviewing && (
        <Modal title="Review Order" onClose={() => setReviewing(null)}>
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-canvas p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink">{reviewing.product.name}</span>
                <span className="text-ink-muted">
                  {quantityFor(reviewing.product._id)} × {money(reviewing.priceCents)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm font-semibold">
                <span className="text-ink">Total</span>
                <span className="text-ink">{money(reviewing.priceCents * quantityFor(reviewing.product._id))}</span>
              </div>
            </div>
            <p className="text-xs text-ink-faint">
              Placing this order charges a real Square Sandbox test card and creates a real Order — this is not a
              simulated event.
            </p>
            <button
              onClick={placeOrder}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Place Order
            </button>
          </div>
        </Modal>
      )}

      {order && (
        <div className="mt-8 rounded-xl border border-line bg-surface p-6">
          <OrderProgress stage={order.stage} />

          <div className="mt-6 flex flex-col gap-2 border-t border-line-soft pt-5 text-sm">
            <ReceiptRow label="Product" value={`${order.item.product.name} × ${order.quantity}`} />
            {order.result && (
              <>
                <ReceiptRow label="Total" value={order.result.totalMoney} />
                <ReceiptRow label="Order Id" value={order.result.orderId} mono />
                <ReceiptRow label="Payment Id" value={order.result.paymentId} mono />
                <ReceiptRow label="Payment Status" value={order.result.paymentStatus ?? '—'} />
              </>
            )}
          </div>

          <div className="mt-5 border-t border-line-soft pt-5">
            {order.stage === 'confirmed' && (
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="success">Confirmed via real Square webhook</Badge>
                <span className="font-mono text-xs text-ink-muted">
                  Inventory {order.quantityBefore} → {orderProduct?.quantity}
                </span>
              </div>
            )}
            {order.stage === 'delayed' && (
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="warning">Still processing</Badge>
                <span className="text-xs text-ink-faint">
                  Taking longer than usual — Render's free tier may be waking up. Check the Sales page shortly.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StoreCard({
  item,
  quantity,
  onQuantityChange,
  onBuy,
}: {
  item: StoreItem;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onBuy: () => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-base font-bold text-brand-ink">
          {item.product.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{item.product.name}</h3>
          <p className="text-xs text-ink-faint">{item.product.sku}</p>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between text-sm">
        <span className="text-ink-muted">{money(item.priceCents)} / unit</span>
        <span className="text-ink-faint">{item.availableOnSquare} in stock</span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-line">
          <button
            onClick={() => onQuantityChange(quantity - 1)}
            className="flex h-9 w-9 items-center justify-center text-ink-muted hover:text-ink"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-medium text-ink">{quantity}</span>
          <button
            onClick={() => onQuantityChange(quantity + 1)}
            className="flex h-9 w-9 items-center justify-center text-ink-muted hover:text-ink"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          onClick={onBuy}
          className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}

function OrderProgress({ stage }: { stage: OrderStage }) {
  const steps: { key: OrderStage | 'confirmed'; label: string }[] = [
    { key: 'placing', label: 'Placing order' },
    { key: 'awaiting-webhook', label: 'Awaiting Square confirmation' },
    { key: 'confirmed', label: 'Inventory updated' },
  ];
  const order: OrderStage[] = ['placing', 'awaiting-webhook', 'confirmed'];
  const currentIndex = stage === 'delayed' ? 1 : order.indexOf(stage);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const done = i < currentIndex || stage === 'confirmed';
        const active = i === currentIndex && stage !== 'confirmed';
        return (
          <div key={step.key} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : active
                      ? 'bg-brand-soft text-brand-ink'
                      : 'bg-surface-3 text-ink-faint'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-xs font-medium ${done || active ? 'text-ink' : 'text-ink-faint'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-line" />}
          </div>
        );
      })}
    </div>
  );
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-32 shrink-0 text-ink-faint">{label}</dt>
      <dd className={`min-w-0 break-all text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
