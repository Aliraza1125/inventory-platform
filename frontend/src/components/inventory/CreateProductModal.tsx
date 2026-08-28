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
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await dispatch(
        createProductThunk({
          name,
          sku,
          description,
          quantity: Number(quantity),
          price: Math.round(Number(price) * 100),
        }),
      ).unwrap();
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
        <div className="grid grid-cols-2 gap-4">
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
          <Field label="Price (per unit)">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-faint">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1.00"
                className={`${inputClass} pl-6`}
              />
            </div>
          </Field>
        </div>
        <p className="text-xs text-ink-faint">
          Required so this product can be sold through the Store — every product needs a real price, not a
          placeholder.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create Product'}
        </button>
      </form>
    </Modal>
  );
}

const inputClass =
  'w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-brand';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
