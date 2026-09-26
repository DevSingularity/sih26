'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiGet } from '@/lib/apiClient';
import Sidebar from '@/lib/Sidebar';

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value ?? '--'}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [snapshots, setSnapshots] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [sos, setSos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [stationsData, alertsData, sosData] = await Promise.all([
          apiGet('/api/stations'),
          apiGet('/api/alerts?status=open'),
          apiGet('/api/sos?status=reported'),
        ]);

        setStations(stationsData);
        setAlerts(alertsData);
        setSos(sosData);

        const snapMap = {};
        for (const s of stationsData) {
          try {
            snapMap[s.id] = await apiGet(`/api/stations/${s.id}/snapshot`);
          } catch { /* station may not have snapshot */ }
        }
        setSnapshots(snapMap);
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
        <h1 className="text-2xl font-bold mb-6">Operations Dashboard</h1>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Stations" value={stations.length} />
          <StatCard label="Open Alerts" value={alerts.length} color={alerts.length > 0 ? 'text-red-600' : 'text-green-600'} />
          <StatCard label="Open SOS" value={sos.length} color={sos.length > 0 ? 'text-red-600' : 'text-green-600'} />
          <StatCard
            label="Total Personnel"
            value={Object.values(snapshots).reduce((sum, s) => sum + (s.personnel_count || 0), 0)}
          />
        </div>

        {sos.length > 0 && (
          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-bold text-red-700 mb-2">Active SOS Incidents</h2>
            <div className="space-y-2">
              {sos.map((s) => (
                <div key={s.id} className="bg-white rounded p-3 flex justify-between items-center">
                  <div>
                    <span className="font-mono text-xs text-gray-500">{s.id.slice(0, 8)}</span>
                    <span className="ml-2 font-medium">{s.personnel_name || 'Unknown'}</span>
                    <span className="ml-2 text-sm text-gray-500">{s.incident_type} — {s.severity}</span>
                  </div>
                  <button
                    onClick={() => router.push('/sos')}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {stations.map((station) => {
            const snap = snapshots[station.id];
            return (
              <div key={station.id} className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-2">{station.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Personnel</p>
                    <p className="font-bold">{snap?.personnel_count ?? '--'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Active Alerts</p>
                    <p className={`font-bold ${snap?.active_alerts_count > 0 ? 'text-red-600' : ''}`}>
                      {snap?.active_alerts_count ?? '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Cargo Items</p>
                    <p className="font-bold">
                      {snap?.cargo_summary?.reduce((s, c) => s + parseInt(c.count), 0) ?? '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Resources</p>
                    <p className="font-bold">
                      {snap?.resource_summary?.reduce((s, r) => s + parseInt(r.count), 0) ?? '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-bold text-green-600">{station.status}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
