'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiGet, apiPost } from '@/lib/apiClient';
import Sidebar from '@/lib/Sidebar';

export default function AlertsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('open');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  async function loadAlerts() {
    try {
      const data = await apiGet(`/api/alerts?status=${filter}`);
      setAlerts(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (user) loadAlerts();
  }, [user, filter]);

  async function handleAction(id, action) {
    try {
      await apiPost(`/api/alerts/${id}/${action}`);
      loadAlerts();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading || !user) return <div className="flex-1 p-8">Loading...</div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Risk & Alert Center</h1>
          <div className="flex gap-2">
            {['open', 'acknowledged', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-sm capitalize ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No alerts found.</p>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                a.severity === 'critical' ? 'border-red-500' :
                a.severity === 'warning' ? 'border-yellow-500' : 'border-blue-500'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        a.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        a.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {a.severity}
                      </span>
                      <span className="text-xs text-gray-500">{a.source_type}</span>
                      <span className="text-xs text-gray-500">{a.station_name}</span>
                    </div>
                    <p className="font-medium">{a.title}</p>
                    {a.message && <p className="text-sm text-gray-600 mt-1">{a.message}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {a.status === 'open' && (
                      <button onClick={() => handleAction(a.id, 'acknowledge')}
                        className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">
                        Acknowledge
                      </button>
                    )}
                    {a.status !== 'resolved' && (
                      <button onClick={() => handleAction(a.id, 'resolve')}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
