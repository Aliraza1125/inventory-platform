import { useState } from 'react';
import { errorMessage } from '@/utilities/errorMessage';
import { useAppDispatch } from '@/redux/hooks';
import { connectProviderThunk, disconnectProviderThunk } from '@/redux/posSlice';
import { notify } from '@/redux/notificationsSlice';
import { Badge } from '@/components/Badge';
import type { POSConnectionSummary } from '@/types';

const PROVIDER_LABEL: Record<string, string> = { square: 'Square', toast: 'Toast' };

function statusBadge(connection: POSConnectionSummary) {
  if (connection.status !== 'connected') return <Badge variant="neutral">Not Connected</Badge>;
  return <Badge variant="success">Connected (Live)</Badge>;
}

export function ConnectionCard({ connection }: { connection: POSConnectionSummary }) {
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
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-ink">{PROVIDER_LABEL[connection.provider]}</h3>
        {statusBadge(connection)}
      </div>

      {connection.status === 'connected' && (connection.locationName || connection.locationId || connection.merchantId) && (
        <dl className="mt-4 space-y-1 text-sm text-ink-muted">
          {(connection.locationName || connection.locationId) && (
            <div className="flex justify-between">
              <dt>Location</dt>
              <dd className="text-ink-muted">{connection.locationName ?? connection.locationId}</dd>
            </div>
          )}
          {connection.merchantId && (
            <div className="flex justify-between">
              <dt>Merchant</dt>
              <dd className="text-ink-muted">{connection.merchantId}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-5 flex gap-2">
        {connection.status === 'connected' ? (
          <button
            onClick={disconnect}
            disabled={busy}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2 disabled:opacity-50"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={busy}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            Connect {PROVIDER_LABEL[connection.provider]}
          </button>
        )}
      </div>
    </div>
  );
}
