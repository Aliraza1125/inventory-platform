import type { ReactNode } from 'react';

const VARIANTS = {
  success: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/30',
  neutral: 'bg-surface-3 text-ink-muted ring-1 ring-inset ring-line',
  info: 'bg-brand-soft text-brand-ink ring-1 ring-inset ring-brand/30',
} as const;

export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: keyof typeof VARIANTS }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}
