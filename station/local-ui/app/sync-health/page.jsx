'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/apiClient';

export default function SyncHealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchHealth() {
    try {
      const data = await apiGet('/api/sync-health');
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-center">Loading sync health...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sync Health</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded p-6 text-center">
          <div className="text-sm text-gray-500 mb-1">Pending Outbox Events</div>
          <div className={`text-4xl font-bold ${health.pending_outbox_count > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {health.pending_outbox_count}
          </div>
          <div className="text-xs text-gray-400 mt-1">Waiting for Kafka</div>
        </div>

        <div className="border rounded p-6 text-center">
          <div className="text-sm text-gray-500 mb-1">Last Kafka Produce</div>
          <div className="text-lg font-semibold">
            {health.last_kafka_produce_at
              ? new Date(health.last_kafka_produce_at).toLocaleString()
              : 'Never'}
          </div>
          <div className="text-xs text-gray-400 mt-1">maitri.station.events</div>
        </div>

        <div className="border rounded p-6 text-center">
          <div className="text-sm text-gray-500 mb-1">Last Sync-Down from India</div>
          <div className="text-lg font-semibold">
            {health.last_sync_down?.completed_at
              ? new Date(health.last_sync_down.completed_at).toLocaleString()
              : 'Never'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {health.last_sync_down?.records_pulled ?? 0} records pulled
          </div>
        </div>
      </div>
    </div>
  );
}
