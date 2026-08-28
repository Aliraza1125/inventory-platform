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

  if (!data || data.product._id !== id) return <p className="text-sm text-slate-500">Loading…</p>;

  const { product, allocations, transactions } = data;

  return (
    <div>
      <button onClick={() => navigate('/inventory')} className="mb-4 text-xs text-slate-500 hover:text-slate-300">
        ← Back to Inventory
      </button>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku}${product.description ? ` · ${product.description}` : ''}`}
        actions={
          <button
            onClick={() => setShowAllocate(true)}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
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
        <h2 className="mb-3 text-sm font-semibold text-slate-200">POS Allocations</h2>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">POS</th>
                <th className="px-4 py-3">POS Product Id</th>
                <th className="px-4 py-3 text-right">Allocated Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {allocations.map((allocation) => (
                <tr key={allocation._id}>
                  <td className="px-4 py-3 capitalize text-slate-200">{allocation.posProvider}</td>
                  <td className="px-4 py-3 text-slate-400">{allocation.posProductId}</td>
                  <td className="px-4 py-3 text-right text-slate-200">{allocation.allocatedQuantity}</td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Not allocated to any POS yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Inventory History</h2>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">External Id</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {transactions.map((tx) => (
                <tr key={tx._id}>
                  <td className="px-4 py-3 text-slate-200">{tx.type}</td>
                  <td className="px-4 py-3 text-slate-400">{tx.source}</td>
                  <td className="px-4 py-3 text-slate-400">{tx.externalTransactionId}</td>
                  <td className="px-4 py-3 text-right text-slate-200">{tx.quantity}</td>
                  <td className="px-4 py-3">
                    <Badge variant={tx.status === 'COMPLETED' ? 'success' : 'danger'}>{tx.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(tx.processedAt).toLocaleString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No inventory transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-slate-600">
        <Link to="/pos" className="hover:text-slate-400">
          Go to POS Connections to ring up a sale for this product →
        </Link>
      </p>

      {showAllocate && <AllocateModal product={product} onClose={() => setShowAllocate(false)} />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
    </div>
  );
}
