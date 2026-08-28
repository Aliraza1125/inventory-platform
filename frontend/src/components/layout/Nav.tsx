import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/pos', label: 'POS Connections', end: false },
  { to: '/inventory', label: 'Inventory', end: false },
  { to: '/checkout', label: 'Store', end: false },
  { to: '/sales', label: 'Sales', end: false },
];

export function Nav() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          IP
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-ink">Inventory Platform</p>
          <p className="text-xs leading-tight text-ink-faint">Operations Console</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
