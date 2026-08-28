import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { dismiss, selectNotifications, type Notification, type NotificationKind } from '@/redux/notificationsSlice';

const KIND_STYLES: Record<NotificationKind, string> = {
  success: 'border-emerald-500/40 bg-emerald-950 text-emerald-100',
  error: 'border-red-500/40 bg-red-950 text-red-100',
  info: 'border-line bg-surface-3 text-ink',
};

/** Owns its own dismiss timer so one toast's lifetime is unaffected by others arriving/leaving. */
function Toast({ item }: { item: Notification }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismiss(item.id)), 4500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-runs if this toast's id changes
  }, [item.id]);

  return <div className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${KIND_STYLES[item.kind]}`}>{item.message}</div>;
}

export function ToastContainer() {
  const items = useAppSelector(selectNotifications);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {items.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </div>
  );
}
