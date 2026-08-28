import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchProduct, selectCurrentProduct } from '@/redux/inventorySlice';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { AllocateModal } from '@/components/inventory/AllocateModal';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectCurrentProduct);
  const [showAllocate, setShowAllocate] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchProduct(id));
  }, [dispatch, id]);

  if (!data || data.product._id !== id) return <p className="text-sm text-ink-faint">Loading…</p>;

  const { product, allocations, transactions } = data;

  return (
    <div>
      <button onClick={() => navigate('/inventory')} className="mb-4 text-xs text-ink-faint hover:text-ink">
        ← Back to Inventory
      </button>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku}${product.description ? ` · ${product.description}` : ''}`}
        actions={
          <button
            onClick={() => setShowAllocate(true)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Allocate to POS
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Total Quantity" value={product.quantity} />
        <Metric label="Allocated" value={product.allocatedQuantity} />
        <Metric label="Available (unallocated)" value={product.availableQuantity} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-ink">POS Allocations</h2>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">POS</th>
                <th className="px-4 py-3">POS Product Id</th>
                <th className="px-4 py-3 text-right">Allocated Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-canvas/50">
              {allocations.map((allocation) => (
                <tr key={allocation._id}>
                  <td className="px-4 py-3 capitalize text-ink">{allocation.posProvider}</td>
                  <td className="px-4 py-3 text-ink-muted">{allocation.posProductId}</td>
                  <td className="px-4 py-3 text-right text-ink">{allocation.allocatedQuantity}</td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-ink-faint">
                    Not allocated to any POS yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-ink">Inventory History</h2>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">External Id</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-canvas/50">
              {transactions.map((tx) => (
                <tr key={tx._id}>
                  <td className="px-4 py-3 text-ink">{tx.type}</td>
                  <td className="px-4 py-3 text-ink-muted">{tx.source}</td>
                  <td className="px-4 py-3 text-ink-muted">{tx.externalTransactionId}</td>
                  <td className="px-4 py-3 text-right text-ink">{tx.quantity}</td>
                  <td className="px-4 py-3">
                    <Badge variant={tx.status === 'COMPLETED' ? 'success' : 'danger'}>{tx.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-faint">{new Date(tx.processedAt).toLocaleString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-faint">
                    No inventory transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-ink-faint">
        <Link to="/pos" className="hover:text-ink">
          Go to POS Connections to ring up a sale for this product →
        </Link>
      </p>

      {showAllocate && <AllocateModal product={product} onClose={() => setShowAllocate(false)} />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
