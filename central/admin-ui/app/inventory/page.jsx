'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiGet } from '@/lib/apiClient';
import Sidebar from '@/lib/Sidebar';

export default function InventoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    apiGet('/api/inventory')
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [user]);

  if (loading || !user) return <div className="flex-1 p-8">Loading...</div>;

  const lowStock = items.filter(i => i.reorder_threshold && i.quantity_on_hand <= i.reorder_threshold);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Inventory</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {lowStock.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 font-semibold text-sm">{lowStock.length} items below reorder threshold</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-2 text-left">Item</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">On Hand</th>
              <th className="px-4 py-2 text-left">Reorder At</th>
              <th className="px-4 py-2 text-left">Station</th>
            </tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className={`border-t hover:bg-gray-50 ${
                  i.reorder_threshold && i.quantity_on_hand <= i.reorder_threshold ? 'bg-yellow-50' : ''
                }`}>
                  <td className="px-4 py-2">{i.item_name}</td>
                  <td className="px-4 py-2 text-xs">{i.item_category}</td>
                  <td className="px-4 py-2 font-medium">{i.quantity_on_hand} {i.unit || ''}</td>
                  <td className="px-4 py-2 text-xs">{i.reorder_threshold ?? '--'}</td>
                  <td className="px-4 py-2 text-xs">{i.station_name || '--'}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No inventory data</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
