'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiGet } from '@/lib/apiClient';
import Sidebar from '@/lib/Sidebar';

export default function CargoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [shipments, setShipments] = useState([]);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('shipments');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [s, i] = await Promise.all([apiGet('/api/cargo/shipments'), apiGet('/api/cargo/items')]);
        setShipments(s);
        setItems(i);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [user]);

  if (loading || !user) return <div className="flex-1 p-8">Loading...</div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Cargo & Inventory</h1>

        <div className="flex gap-2 mb-4">
          {['shipments', 'items'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded text-sm capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {tab === 'shipments' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Origin</th>
                <th className="px-4 py-2 text-left">Mode</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">ETA</th>
              </tr></thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{s.shipment_code}</td>
                    <td className="px-4 py-2">{s.origin || '--'}</td>
                    <td className="px-4 py-2 capitalize">{s.mode || '--'}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${
                      s.status === 'delayed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>{s.status}</span></td>
                    <td className="px-4 py-2 text-xs">{s.eta ? new Date(s.eta).toLocaleDateString() : '--'}</td>
                  </tr>
                ))}
                {shipments.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No shipments</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'items' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Qty</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Station</th>
              </tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{i.item_name}</td>
                    <td className="px-4 py-2 text-xs">{i.category || '--'}</td>
                    <td className="px-4 py-2">{i.quantity} {i.unit || ''}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${
                      i.status === 'stored' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{i.status}</span></td>
                    <td className="px-4 py-2 text-xs">{i.station_name || '--'}</td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No items</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
