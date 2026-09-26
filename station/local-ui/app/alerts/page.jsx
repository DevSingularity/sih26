'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/apiClient';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/alerts')
      .then(setAlerts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading alerts...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Local Threshold Alerts</h1>

      {alerts.length === 0 ? (
        <div className="bg-green-50 border border-green-300 rounded p-4 text-green-800">
          No alerts — all metrics within thresholds
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className={`border-l-4 rounded p-4 ${
              alert.severity === 'critical' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    alert.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="ml-2 font-semibold">{alert.metric}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {alert.acknowledged ? 'Acknowledged' : 'Open'}
                </span>
              </div>
              <p className="text-sm mt-1">
                Current: <strong>{alert.current_value}</strong> | Threshold: {alert.threshold_value}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Raised: {new Date(alert.raised_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
