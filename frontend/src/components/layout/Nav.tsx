import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/pos', label: 'POS Connections', end: false },
  { to: '/inventory', label: 'Inventory', end: false },
  { to: '/sales', label: 'Sales', end: false },
];

export function Nav() {
  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-950 px-4 py-6">
      <div className="mb-8 px-2">
        <p className="text-sm font-semibold tracking-wide text-slate-50">Inventory Platform</p>
        <p className="text-xs text-slate-500">POS Integration Demo</p>
      </div>
      <nav className="flex flex-col gap-1">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-slate-800 text-slate-50' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
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
