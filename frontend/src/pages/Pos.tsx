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
        description="Square is a live connection — inventory only depletes from a real Square webhook. Toast runs in Mock Mode."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {connections.map((connection) => (
          <ConnectionCard key={connection.provider} connection={connection}>
            {connection.provider === 'toast' && connection.status === 'connected' && connection.mode === 'mock' && (
              <MockToastTerminal />
            )}
          </ConnectionCard>
        ))}
      </div>
    </div>
  );
}
