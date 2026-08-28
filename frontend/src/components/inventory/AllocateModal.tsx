import { useState, type FormEvent } from 'react';
import { errorMessage } from '@/utilities/errorMessage';
import { useAppDispatch } from '@/redux/hooks';
import { allocateThunk, fetchAllocations } from '@/redux/posSlice';
import { fetchProduct, fetchProducts } from '@/redux/inventorySlice';
import { fetchDashboardSummary } from '@/redux/dashboardSlice';
import { notify } from '@/redux/notificationsSlice';
import { Modal } from '@/components/Modal';
import type { POSProviderName, Product } from '@/types';

export function AllocateModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [posProvider, setPosProvider] = useState<POSProviderName>('toast');
  const [quantity, setQuantity] = useState(String(Math.min(product.availableQuantity, 10)));
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await dispatch(allocateThunk({ productId: product._id, posProvider, quantity: Number(quantity) })).unwrap();
      dispatch(notify(`Allocated ${quantity} units of "${product.name}" to ${posProvider}.`, 'success'));
      dispatch(fetchProducts());
      dispatch(fetchAllocations());
      dispatch(fetchProduct(product._id));
      dispatch(fetchDashboardSummary());
      onClose();
    } catch (err) {
      dispatch(notify(errorMessage(err), 'error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Allocate "${product.name}"`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-slate-500">
          Total stock: {product.quantity} · Already allocated: {product.allocatedQuantity} · Unallocated:{' '}
          {product.availableQuantity}
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">POS</span>
          <select
            value={posProvider}
            onChange={(e) => setPosProvider(e.target.value as POSProviderName)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="toast">Toast</option>
            <option value="square">Square</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Allocated Quantity</span>
          <input
            type="number"
            min={0}
            max={product.quantity}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {busy ? 'Allocating…' : 'Allocate Inventory'}
        </button>
      </form>
    </Modal>
  );
}
