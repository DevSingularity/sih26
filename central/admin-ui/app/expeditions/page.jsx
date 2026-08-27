'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiGet, apiPost } from '@/lib/apiClient';
import Sidebar from '@/lib/Sidebar';

export default function ExpeditionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [expeditions, setExpeditions] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', station_id: '', start_date: '', end_date: '' });

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  async function loadExpeditions() {
    try {
      const data = await apiGet('/api/expeditions');
      setExpeditions(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (user) loadExpeditions();
  }, [user]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await apiPost('/api/expeditions', form);
      setShowForm(false);
      setForm({ name: '', station_id: '', start_date: '', end_date: '' });
      loadExpeditions();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading || !user) return <div className="flex-1 p-8">Loading...</div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Expeditions</h1>
          {user.role !== 'viewer' && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              {showForm ? 'Cancel' : '+ New Expedition'}
            </button>
          )}
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Expedition name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border rounded px-3 py-2 text-sm" required />
              <input placeholder="Station ID" value={form.station_id} onChange={(e) => setForm({ ...form, station_id: e.target.value })}
                className="border rounded px-3 py-2 text-sm" required />
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="border rounded px-3 py-2 text-sm" required />
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="border rounded px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Create</button>
          </form>
        )}

        <div className="space-y-3">
          {expeditions.map((e) => (
            <div key={e.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{e.name}</h3>
                  <p className="text-sm text-gray-500">
                    {e.station_name || 'Unknown station'} | {e.start_date} — {e.end_date || 'ongoing'}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  e.status === 'active' ? 'bg-green-100 text-green-700' :
                  e.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  e.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>{e.status}</span>
              </div>
            </div>
          ))}
          {expeditions.length === 0 && <p className="text-gray-400 text-center py-8">No expeditions yet.</p>}
        </div>
      </main>
    </div>
  );
}
