import { useEffect, useState } from 'react';
import { errorMessage } from '@/utilities/errorMessage';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchProducts, selectProducts } from '@/redux/inventorySlice';
import { fetchAllocations } from '@/redux/posSlice';
import { simulateSaleThunk } from '@/redux/salesSlice';
import { fetchDashboardSummary } from '@/redux/dashboardSlice';
import { notify } from '@/redux/notificationsSlice';
import { Badge } from '@/components/Badge';
import type { SaleProcessingResult } from '@/types';

// Stands in for Toast's own POS terminal (no Toast API access — see README). Square can only
// be depleted by a real webhook.
export function MockToastTerminal() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SaleProcessingResult | null>(null);

  useEffect(() => {
    if (products.length === 0) dispatch(fetchProducts());
  }, [dispatch, products.length]);

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0]._id);
  }, [products, productId]);

  async function ringUpSale() {
    if (!productId) return;
    setBusy(true);
    try {
      const saleResult = await dispatch(
        simulateSaleThunk({ productId, posProvider: 'toast', quantity: Number(quantity) }),
      ).unwrap();
      setResult(saleResult);
      dispatch(
        notify(saleResult.status === 'duplicate' ? 'Duplicate event ignored (idempotent).' : 'Sale rung up on Toast.', 'success'),
      );
      // Refresh everywhere this sale's numbers show up.
      dispatch(fetchProducts());
      dispatch(fetchAllocations());
      dispatch(fetchDashboardSummary());
    } catch (err) {
      dispatch(notify(errorMessage(err), 'error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-950/10 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-amber-400">
        Mock Toast Terminal — stands in for Toast's real POS
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Product</span>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          >
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Qty</span>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          />
        </label>
        <button
          onClick={ringUpSale}
          disabled={busy || !productId}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {busy ? 'Ringing up…' : 'Ring Up Sale on Toast'}
        </button>
      </div>

      {result && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-amber-500/10 pt-3 text-sm">
          <Badge variant={result.status === 'processed' ? 'success' : 'info'}>
            {result.status === 'processed' ? 'Sale Completed' : 'Duplicate — Already Processed'}
          </Badge>
          {result.productQuantityBefore !== undefined && (
            <span className="font-mono text-slate-300">
              Inventory {result.productQuantityBefore} → {result.productQuantityAfter}
            </span>
          )}
          {result.allocationBefore !== undefined && (
            <span className="font-mono text-slate-300">
              Toast Allocation {result.allocationBefore} → {result.allocationAfter}
            </span>
          )}
          <span className="font-mono text-xs text-slate-500">{result.transaction.externalTransactionId}</span>
        </div>
      )}
    </div>
  );
}
