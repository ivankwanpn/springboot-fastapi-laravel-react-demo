import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    to: '/transfer',
    label: 'Transfer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
    ),
  },
  {
    to: '/transactions',
    label: 'History',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20a8 8 0 100-16 8 8 0 000 16z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'ROLE_ADMIN';

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const linkClass = (path: string) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-emerald-500/10 text-emerald-400'
        : 'text-navy-300 hover:bg-navy-700 hover:text-white'
    }`;

  return (
    <aside className="flex w-64 flex-col border-r border-navy-600 bg-navy-900">
      <div className="flex h-16 items-center gap-3 border-b border-navy-600 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M12 9v6M9 12h6" />
          </svg>
        </div>
        <span className="text-base font-semibold tracking-tight text-white">Digital Wallet</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass(item.to)}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="px-3 pt-4 pb-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-navy-400">Admin</p>
            </div>
            <NavLink to="/admin/users" className={linkClass('/admin/users')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              User Management
            </NavLink>
            <NavLink to="/admin/transactions" className={linkClass('/admin/transactions')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Transaction Monitoring
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-navy-600 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-500 text-sm font-medium text-navy-200">
            {user?.username?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username ?? 'User'}</p>
            <p className="text-xs text-navy-400">{user?.role ?? ''}</p>
          </div>
          <button
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-700 hover:text-white transition-colors"
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
