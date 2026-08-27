'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/sos', label: 'SOS' },
  { href: '/sync-health', label: 'Sync Health' },
  { href: '/cargo', label: 'Cargo' },
  { href: '/alerts', label: 'Alerts' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 flex items-center gap-6">
      <span className="font-bold text-lg mr-4">PolarOps</span>
      {links.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-sm ${pathname === link.href ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
