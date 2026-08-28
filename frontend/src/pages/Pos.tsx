import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchConnections, selectConnections } from '@/redux/posSlice';
import { PageHeader } from '@/components/PageHeader';
import { ConnectionCard } from '@/components/pos/ConnectionCard';
import { MockToastTerminal } from '@/components/pos/MockToastTerminal';

export function Pos() {
  const dispatch = useAppDispatch();
  const connections = useAppSelector(selectConnections);

  useEffect(() => {
    dispatch(fetchConnections());
  }, [dispatch]);

  return (
    <div>
      <PageHeader
        title="POS Connections"
        description="Square is a real sandbox connection — its inventory only depletes from a real Square webhook. Toast runs in Mock Mode (no Toast API access available) — see the README."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {connections.map((connection) => (
          <ConnectionCard key={connection.provider} connection={connection}>
            {connection.provider === 'toast' && connection.status === 'connected' && connection.mode === 'mock' && (
              <MockToastTerminal />
            )}
            {connection.provider === 'square' && connection.status === 'connected' && (
              <p className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3 text-xs text-emerald-300">
                Live connection. Trigger a real sandbox sale from Square's own dashboard or{' '}
                <code className="rounded bg-black/30 px-1">npm run square:test-sale</code> in{' '}
                <code className="rounded bg-black/30 px-1">backend/</code> — inventory will deplete automatically
                once Square's webhook is delivered. See the README "Demonstrating the Full Workflow" section.
              </p>
            )}
          </ConnectionCard>
        ))}
      </div>
    </div>
  );
}
