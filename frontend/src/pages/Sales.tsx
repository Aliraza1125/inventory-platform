import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchSales, selectTransactions } from '@/redux/salesSlice';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import type { InventoryTransaction, Product } from '@/types';

function productLabel(productId: InventoryTransaction['productId']): string {
  if (!productId) return '—';
  if (typeof productId === 'string') return productId;
  return (productId as Product).name ?? '—';
}

export function Sales() {
  const dispatch = useAppDispatch();
  const transactions = useAppSelector(selectTransactions);

  useEffect(() => {
    dispatch(fetchSales());
  }, [dispatch]);

  return (
    <div>
      <PageHeader title="Sales / Transactions" description="Every SALE, RESTOCK, and ADJUSTMENT recorded on the platform." />

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">POS</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3">Transaction Id</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {transactions.map((tx) => (
              <tr key={tx._id}>
                <td className="px-4 py-3 capitalize text-slate-200">{tx.provider}</td>
                <td className="px-4 py-3 text-slate-300">{productLabel(tx.productId)}</td>
                <td className="px-4 py-3 text-slate-400">{tx.type}</td>
                <td className="px-4 py-3 text-right text-slate-200">{tx.quantity}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{tx.externalTransactionId}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(tx.processedAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Badge variant={tx.status === 'COMPLETED' ? 'success' : 'danger'}>{tx.status}</Badge>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
