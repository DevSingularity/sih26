'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiGet, apiPost } from '@/lib/apiClient';
import Sidebar from '@/lib/Sidebar';

const SEVERITY_COLORS = {
  critical: 'bg-red-100 border-red-500 text-red-800',
  high: 'bg-orange-100 border-orange-500 text-orange-800',
  medium: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  low: 'bg-blue-100 border-blue-500 text-blue-800',
};

const STATUS_LABELS = {
  reported: 'New',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export default function SosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('active');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  async function loadIncidents() {
    try {
      const status = filter === 'active' ? undefined : filter;
      const qs = status ? `?status=${status}` : '';
      const data = await apiGet(`/api/sos${qs}`);
      setIncidents(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (user) loadIncidents();
  }, [user, filter]);

  async function handleAction(id, action) {
    try {
      await apiPost(`/api/sos/${id}/${action}`);
      loadIncidents();
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
          <div>
            <h1 className="text-2xl font-bold text-red-700">SOS / Emergency Response</h1>
            <p className="text-sm text-gray-500 mt-1">Active emergency incidents requiring immediate attention</p>
          </div>
          <div className="flex gap-2">
            {['active', 'reported', 'acknowledged', 'in_progress', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-sm capitalize ${
                  filter === f ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {incidents.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <p className="text-green-700 text-lg font-semibold">No active SOS incidents</p>
            <p className="text-green-600 text-sm mt-1">All personnel accounted for.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className={`border-2 rounded-lg p-4 ${SEVERITY_COLORS[inc.severity] || 'bg-gray-50 border-gray-300'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono opacity-60">{inc.id.slice(0, 8)}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-white/50">
                        {inc.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-white/50">
                        {STATUS_LABELS[inc.status] || inc.status}
                      </span>
                    </div>
                    <p className="font-semibold">{inc.incident_type} incident</p>
                    {inc.description && <p className="text-sm mt-1 opacity-80">{inc.description}</p>}
                    <p className="text-xs mt-2 opacity-60">
                      Reported by: {inc.personnel_name || 'Unknown'} | Station: {inc.station_name || 'Unknown'} | {new Date(inc.reported_at).toLocaleString()}
                    </p>
                    {inc.latitude && inc.longitude && (
                      <p className="text-xs mt-1 opacity-60">Location: {inc.latitude.toFixed(4)}, {inc.longitude.toFixed(4)}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {inc.status === 'reported' && (
                      <button
                        onClick={() => handleAction(inc.id, 'acknowledge')}
                        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                      >
                        Acknowledge
                      </button>
                    )}
                    {(inc.status === 'acknowledged' || inc.status === 'in_progress') && (
                      <button
                        onClick={() => handleAction(inc.id, 'resolve')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
