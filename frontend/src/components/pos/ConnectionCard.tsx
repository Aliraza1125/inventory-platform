import { useState, type ReactNode } from 'react';
import { errorMessage } from '@/utilities/errorMessage';
import { useAppDispatch } from '@/redux/hooks';
import { connectProviderThunk, disconnectProviderThunk } from '@/redux/posSlice';
import { notify } from '@/redux/notificationsSlice';
import { Badge } from '@/components/Badge';
import type { POSConnectionSummary } from '@/types';

const PROVIDER_LABEL: Record<string, string> = { square: 'Square', toast: 'Toast' };

function statusBadge(connection: POSConnectionSummary) {
  if (connection.status !== 'connected') return <Badge variant="neutral">Not Connected</Badge>;
  if (connection.mode === 'mock') return <Badge variant="warning">Mock Mode</Badge>;
  return <Badge variant="success">Connected (Live)</Badge>;
}

export function ConnectionCard({ connection, children }: { connection: POSConnectionSummary; children?: ReactNode }) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      await dispatch(connectProviderThunk(connection.provider)).unwrap();
      dispatch(notify(`${PROVIDER_LABEL[connection.provider]} connected.`, 'success'));
    } catch (err) {
      dispatch(notify(errorMessage(err), 'error'));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await dispatch(disconnectProviderThunk(connection.provider)).unwrap();
      dispatch(notify(`${PROVIDER_LABEL[connection.provider]} disconnected.`, 'info'));
    } catch (err) {
      dispatch(notify(errorMessage(err), 'error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-50">{PROVIDER_LABEL[connection.provider]}</h3>
          {connection.provider === 'toast' && connection.mode === 'mock' && (
            <p className="mt-1 text-xs text-amber-400">
              Simulated integration — no live Toast API calls are made.
            </p>
          )}
        </div>
        {statusBadge(connection)}
      </div>

      <dl className="mt-4 space-y-1 text-sm text-slate-400">
        <div className="flex justify-between">
          <dt>Location</dt>
          <dd className="text-slate-300">{connection.locationName ?? connection.locationId ?? '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Merchant</dt>
          <dd className="text-slate-300">{connection.merchantId ?? '—'}</dd>
        </div>
      </dl>

      <div className="mt-5 flex gap-2">
        {connection.status === 'connected' ? (
          <button
            onClick={disconnect}
            disabled={busy}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={busy}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Connect {PROVIDER_LABEL[connection.provider]}
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
