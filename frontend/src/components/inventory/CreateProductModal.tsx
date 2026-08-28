import { useState, type FormEvent, type ReactNode } from 'react';
import { errorMessage } from '@/utilities/errorMessage';
import { useAppDispatch } from '@/redux/hooks';
import { createProductThunk, fetchProducts } from '@/redux/inventorySlice';
import { fetchDashboardSummary } from '@/redux/dashboardSlice';
import { notify } from '@/redux/notificationsSlice';
import { Modal } from '@/components/Modal';

export function CreateProductModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await dispatch(createProductThunk({ name, sku, description, quantity: Number(quantity) })).unwrap();
      dispatch(notify(`Created product "${name}".`, 'success'));
      dispatch(fetchProducts());
      dispatch(fetchDashboardSummary());
      onClose();
    } catch (err) {
      dispatch(notify(errorMessage(err), 'error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Create Product" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="SKU">
          <input required value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} placeholder="COKE-001" />
        </Field>
        <Field label="Description">
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Initial Quantity">
          <input
            type="number"
            min={0}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputClass}
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create Product'}
        </button>
      </form>
    </Modal>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}
