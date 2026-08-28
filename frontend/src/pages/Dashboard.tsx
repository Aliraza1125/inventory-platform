import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchDashboardSummary, selectDashboardSummary } from '@/redux/dashboardSlice';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import type { InventoryTransaction, Product } from '@/types';

function productLabel(productId: InventoryTransaction['productId']): string {
  if (!productId) return 'Unknown product';
  if (typeof productId === 'string') return productId;
  return (productId as Product).name ?? 'Unknown product';
}

export function Dashboard() {
  const dispatch = useAppDispatch();
  const summary = useAppSelector(selectDashboardSummary);

  useEffect(() => {
    dispatch(fetchDashboardSummary());
  }, [dispatch]);

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of inventory and connected POS activity." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value={summary?.totalProducts ?? '—'} />
        <StatCard label="Total Inventory Units" value={summary?.totalInventory ?? '—'} />
        <StatCard
          label="Connected POS Systems"
          value={summary?.connectedPOS.length ?? 0}
          hint={summary?.connectedPOS.length ? summary.connectedPOS.join(', ') : 'None connected yet'}
        />
        <StatCard label="Recent Sales" value={summary?.recentSales.length ?? 0} hint="Last 10 transactions" />
      </div>

      <div className="mt-8 rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Recent Sales & Inventory Changes</h2>
          <Link to="/sales" className="text-xs font-medium text-brand-ink hover:text-brand">
            View all
          </Link>
        </div>
        <div className="divide-y divide-line">
          {summary?.recentSales.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink-faint">
              No sales yet. Connect a POS and allocate inventory to get started.
            </p>
          )}
          {summary?.recentSales.map((tx) => (
            <div key={tx._id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-ink">{productLabel(tx.productId)}</p>
                <p className="text-xs text-ink-faint">
                  {tx.provider} · {tx.externalTransactionId}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-ink-muted">
                  {tx.type} · {tx.quantity} units
                </span>
                <Badge variant={tx.status === 'COMPLETED' ? 'success' : 'danger'}>{tx.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
