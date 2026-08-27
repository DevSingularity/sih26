'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/sos', label: 'SOS / Emergency', icon: '🚨', highlight: true },
  { href: '/alerts', label: 'Alerts', icon: '⚠️' },
  { href: '/cargo', label: 'Cargo & Inventory', icon: '📦' },
  { href: '/resources', label: 'Resources', icon: '⚡' },
  { href: '/personnel', label: 'Personnel', icon: '👥' },
  { href: '/expeditions', label: 'Expeditions', icon: '🗺️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">PolarOps</h1>
        <p className="text-xs text-gray-400">NCPOR Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : item.highlight
                  ? 'text-red-400 hover:bg-gray-800 font-semibold'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400">{user.username}</p>
          <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
          <button
            onClick={logout}
            className="mt-2 text-xs text-red-400 hover:text-red-300"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
