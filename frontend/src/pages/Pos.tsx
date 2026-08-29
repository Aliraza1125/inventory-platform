import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchConnections, selectConnections } from '@/redux/posSlice';
import { PageHeader } from '@/components/PageHeader';
import { ConnectionCard } from '@/components/pos/ConnectionCard';

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
        description="Inventory only depletes from a real webhook — a connected POS is a genuine live integration, never simulated."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {connections.map((connection) => (
          <ConnectionCard key={connection.provider} connection={connection} />
        ))}
      </div>
    </div>
  );
}
