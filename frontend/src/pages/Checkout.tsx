import { useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '@/utilities/errorMessage';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchProducts, selectProducts } from '@/redux/inventorySlice';
import { fetchAllocations, selectAllocations, squareCheckoutThunk } from '@/redux/posSlice';
import { notify } from '@/redux/notificationsSlice';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import type { Product, SquareCheckoutResult } from '@/types';

interface CartLine {
  product: Product;
  availableOnSquare: number;
  quantity: number;
}

type ConfirmState = 'waiting' | 'confirmed' | 'timed-out';

interface Receipt {
  result: SquareCheckoutResult;
  productId: string;
  quantityBefore: number;
  confirmState: ConfirmState;
}

const POLL_INTERVAL_MS = 3000;
const POLL_ATTEMPTS = 10;

export function Checkout() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const allocations = useAppSelector(selectAllocations);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const pollRef = useRef<{ timer?: ReturnType<typeof setInterval>; attempts: number }>({ attempts: 0 });

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchAllocations());
  }, [dispatch]);

  const storefront: CartLine[] = useMemo(() => {
    return products
      .map((product) => {
        const squareAllocation = allocations.find(
          (a) => a.posProvider === 'square' && (typeof a.productId === 'string' ? a.productId : a.productId._id) === product._id,
        );
        return { product, availableOnSquare: squareAllocation?.allocatedQuantity ?? 0, quantity: quantities[product._id] ?? 1 };
      })
      .filter((line) => line.availableOnSquare > 0);
  }, [products, allocations, quantities]);

  function setQuantity(productId: string, value: number) {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
  }

  function stopPolling() {
    if (pollRef.current.timer) clearInterval(pollRef.current.timer);
    pollRef.current = { attempts: 0 };
  }

  useEffect(() => stopPolling, []);

  async function buy(line: CartLine) {
    stopPolling();
    setBuyingId(line.product._id);
    try {
      const result = await dispatch(
        squareCheckoutThunk({ productId: line.product._id, quantity: line.quantity }),
      ).unwrap();
      dispatch(notify(`Order placed on Square: ${result.totalMoney}`, 'success'));
      setReceipt({ result, productId: line.product._id, quantityBefore: line.product.quantity, confirmState: 'waiting' });
      startPolling(line.product._id, line.product.quantity);
    } catch (err) {
      dispatch(notify(errorMessage(err), 'error'));
    } finally {
      setBuyingId(null);
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
        setReceipt((prev) => (prev ? { ...prev, confirmState: 'confirmed' } : prev));
        stopPolling();
      } else if (pollRef.current.attempts >= POLL_ATTEMPTS) {
        setReceipt((prev) => (prev ? { ...prev, confirmState: 'timed-out' } : prev));
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  const receiptProduct = receipt ? products.find((p) => p._id === receipt.productId) : undefined;

  return (
    <div>
      <PageHeader
        title="Square Checkout"
        description="Stands in for a customer buying on Square. Buying here creates a real Order + Payment on Square's sandbox — inventory only updates once Square's own webhook confirms it back to this platform."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {storefront.map((line) => (
          <div key={line.product._id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-base font-semibold text-slate-50">{line.product.name}</h3>
            <p className="text-xs text-slate-500">{line.product.sku}</p>
            <p className="mt-3 text-sm text-slate-400">
              Available on Square: <span className="font-mono text-slate-200">{line.availableOnSquare}</span>
            </p>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={line.availableOnSquare}
                value={line.quantity}
                onChange={(e) => setQuantity(line.product._id, Math.max(1, Number(e.target.value)))}
                className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
              />
              <button
                onClick={() => buy(line)}
                disabled={buyingId === line.product._id}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {buyingId === line.product._id ? 'Placing order…' : 'Buy Now'}
              </button>
            </div>
          </div>
        ))}
        {storefront.length === 0 && (
          <p className="col-span-full rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-500">
            Nothing allocated to Square yet — allocate a product to Square from the Inventory page first.
          </p>
        )}
      </div>

      {receipt && (
        <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-6">
          <h2 className="mb-3 text-sm font-semibold text-emerald-300">Order Receipt</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Product" value={receipt.result.productName} />
            <Row label="Total" value={receipt.result.totalMoney} />
            <Row label="Order Id" value={receipt.result.orderId} mono />
            <Row label="Payment Id" value={receipt.result.paymentId} mono />
            <Row label="Payment Status" value={receipt.result.paymentStatus ?? '—'} />
          </dl>

          <div className="mt-4 flex items-center gap-3 border-t border-emerald-500/10 pt-4">
            {receipt.confirmState === 'waiting' && (
              <>
                <Badge variant="info">Waiting for Square's webhook…</Badge>
                <span className="text-xs text-slate-400">
                  Inventory: {receipt.quantityBefore} (checking automatically, no action needed)
                </span>
              </>
            )}
            {receipt.confirmState === 'confirmed' && (
              <>
                <Badge variant="success">Confirmed via real Square webhook</Badge>
                <span className="font-mono text-xs text-slate-300">
                  Inventory: {receipt.quantityBefore} → {receiptProduct?.quantity}
                </span>
              </>
            )}
            {receipt.confirmState === 'timed-out' && (
              <>
                <Badge variant="warning">Still processing</Badge>
                <span className="text-xs text-slate-400">
                  Taking longer than usual (Render free tier may be waking up) — check the Sales page shortly.
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-32 shrink-0 text-slate-500">{label}</dt>
      <dd className={`min-w-0 break-all text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
