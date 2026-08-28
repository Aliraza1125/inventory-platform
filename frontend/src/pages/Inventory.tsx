import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '@/utilities/errorMessage';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchProducts, restockProductThunk, selectProducts } from '@/redux/inventorySlice';
import { fetchDashboardSummary } from '@/redux/dashboardSlice';
import { notify } from '@/redux/notificationsSlice';
import { PageHeader } from '@/components/PageHeader';
import { CreateProductModal } from '@/components/inventory/CreateProductModal';
import { AllocateModal } from '@/components/inventory/AllocateModal';
import type { Product } from '@/types';

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function Inventory() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const [showCreate, setShowCreate] = useState(false);
  const [allocateTarget, setAllocateTarget] = useState<Product | null>(null);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  async function restock(product: Product) {
    const amount = window.prompt(`Restock "${product.name}" by how many units?`, '20');
    if (!amount) return;
    try {
      await dispatch(restockProductThunk({ id: product._id, quantity: Number(amount) })).unwrap();
      dispatch(notify(`Restocked ${amount} units of "${product.name}".`, 'success'));
      dispatch(fetchProducts());
      dispatch(fetchDashboardSummary());
    } catch (err) {
      dispatch(notify(errorMessage(err), 'error'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Products on the inventory platform. Allocate quantity to a POS to make it sellable there."
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            + Create Product
          </button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Allocated</th>
              <th className="px-4 py-3 text-right">Available</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-canvas/50">
            {products.map((product) => (
              <tr key={product._id}>
                <td className="px-4 py-3">
                  <Link to={`/inventory/${product._id}`} className="font-medium text-ink hover:text-brand-ink">
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-muted">{product.sku}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-ink">{money(product.price)}</span>
                </td>
                <td className="px-4 py-3 text-right text-ink">{product.quantity}</td>
                <td className="px-4 py-3 text-right text-ink-muted">{product.allocatedQuantity}</td>
                <td className="px-4 py-3 text-right text-ink-muted">{product.availableQuantity}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setAllocateTarget(product)}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-surface-2"
                    >
                      Allocate
                    </button>
                    <button
                      onClick={() => restock(product)}
                      className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-surface-2"
                    >
                      Restock
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-faint">
                  No products yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateProductModal onClose={() => setShowCreate(false)} />}
      {allocateTarget && <AllocateModal product={allocateTarget} onClose={() => setAllocateTarget(null)} />}
    </div>
  );
}
