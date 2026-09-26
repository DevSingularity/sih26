'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiGet } from '@/lib/apiClient';
import Sidebar from '@/lib/Sidebar';

export default function ResourcesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [resources, setResources] = useState([]);
  const [usage, setUsage] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [r, u] = await Promise.all([apiGet('/api/resources'), apiGet('/api/resources/usage')]);
        setResources(r);
        setUsage(u);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [user]);

  if (loading || !user) return <div className="flex-1 p-8">Loading...</div>;

  const byType = {};
  resources.forEach((r) => {
    if (!byType[r.resource_type]) byType[r.resource_type] = [];
    byType[r.resource_type].push(r);
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Resource Management</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {Object.entries(byType).map(([type, list]) => (
          <div key={type} className="mb-6">
            <h2 className="text-lg font-semibold capitalize mb-2">{type}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {list.map((r) => (
                <div key={r.id} className="bg-white rounded-lg shadow p-4">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-gray-500">Capacity: {r.capacity ?? '--'} {r.unit || ''}</p>
                  <p className="text-sm mt-1">
                    Status: <span className={`font-semibold ${
                      r.status === 'operational' ? 'text-green-600' :
                      r.status === 'maintenance' ? 'text-yellow-600' : 'text-red-600'
                    }`}>{r.status}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {resources.length === 0 && <p className="text-gray-400 text-center py-8">No resources configured</p>}

        <h2 className="text-lg font-semibold mt-8 mb-3">Recent Usage</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-2 text-left">Resource</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Quantity</th>
              <th className="px-4 py-2 text-left">When</th>
            </tr></thead>
            <tbody>
              {usage.slice(0, 20).map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{u.resource_name || '--'}</td>
                  <td className="px-4 py-2 capitalize">{u.usage_type}</td>
                  <td className="px-4 py-2">{u.quantity} {u.unit || ''}</td>
                  <td className="px-4 py-2 text-xs">{new Date(u.occurred_at).toLocaleString()}</td>
                </tr>
              ))}
              {usage.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No usage data</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
