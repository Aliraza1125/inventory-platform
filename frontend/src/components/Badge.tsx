import type { ReactNode } from 'react';

const VARIANTS = {
  success: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/30',
  neutral: 'bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-500/30',
  info: 'bg-sky-500/15 text-sky-400 ring-1 ring-inset ring-sky-500/30',
} as const;

export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: keyof typeof VARIANTS }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}
