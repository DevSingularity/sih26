'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiGet } from '@/lib/apiClient';
import Sidebar from '@/lib/Sidebar';

export default function PersonnelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [personnel, setPersonnel] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    apiGet('/api/personnel')
      .then(setPersonnel)
      .catch((err) => setError(err.message));
  }, [user]);

  if (loading || !user) return <div className="flex-1 p-8">Loading...</div>;

  const STATUS_COLORS = {
    active: 'bg-green-100 text-green-700',
    deployed: 'bg-blue-100 text-blue-700',
    on_leave: 'bg-yellow-100 text-yellow-700',
    inactive: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Personnel</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Employee Code</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Designation</th>
              <th className="px-4 py-2 text-left">Station</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr></thead>
            <tbody>
              {personnel.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{p.full_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{p.employee_code}</td>
                  <td className="px-4 py-2 capitalize text-xs">{p.role.replace('_', ' ')}</td>
                  <td className="px-4 py-2 text-xs">{p.designation || '--'}</td>
                  <td className="px-4 py-2 text-xs">{p.station_name || '--'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[p.status] || ''}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
              {personnel.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No personnel</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
