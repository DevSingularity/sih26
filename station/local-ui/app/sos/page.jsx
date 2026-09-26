'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '../../lib/apiClient';

const SEVERITY_COLORS = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-400 text-black',
  low: 'bg-green-400 text-black',
};

const STATUS_COLORS = {
  reported: 'bg-red-100 border-red-400',
  acknowledged: 'bg-yellow-100 border-yellow-400',
  in_progress: 'bg-blue-100 border-blue-400',
  resolved: 'bg-green-100 border-green-400',
};

export default function SOSPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchIncidents() {
    try {
      const data = await apiGet('/api/sos');
      setIncidents(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  async function updateStatus(id, newStatus) {
    try {
      const body = { status: newStatus };
      if (newStatus === 'acknowledged') body.acknowledged_at = new Date().toISOString();
      if (newStatus === 'resolved') body.resolved_at = new Date().toISOString();
      await apiPatch(`/api/sos/${id}`, body);
      fetchIncidents();
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading SOS incidents...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  const openIncidents = incidents.filter(i => i.status !== 'resolved');
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-red-700">SOS Incidents</h1>

      {openIncidents.length === 0 ? (
        <div className="bg-green-50 border border-green-300 rounded p-4 text-green-800 mb-8">
          No open incidents
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {openIncidents.map(inc => (
            <div key={inc.id} className={`border-l-4 rounded p-4 ${STATUS_COLORS[inc.status] || 'bg-gray-50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${SEVERITY_COLORS[inc.severity]}`}>
                      {inc.severity.toUpperCase()}
                    </span>
                    <span className="font-mono text-sm text-gray-500">{inc.id.slice(0, 8)}</span>
                  </div>
                  <p className="font-semibold">{inc.incident_type} — {inc.status}</p>
                  {inc.description && <p className="text-sm text-gray-700 mt-1">{inc.description}</p>}
                  <p className="text-xs text-gray-500 mt-1">Reported: {new Date(inc.reported_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {inc.status === 'reported' && (
                    <button onClick={() => updateStatus(inc.id, 'acknowledged')}
                      className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">
                      Acknowledge
                    </button>
                  )}
                  {(inc.status === 'acknowledged' || inc.status === 'in_progress') && (
                    <button onClick={() => updateStatus(inc.id, 'resolved')}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolvedIncidents.length > 0 && (
        <details>
          <summary className="cursor-pointer text-gray-600 font-semibold mb-2">
            Resolved ({resolvedIncidents.length})
          </summary>
          <div className="space-y-2">
            {resolvedIncidents.map(inc => (
              <div key={inc.id} className="border rounded p-3 bg-gray-50 text-sm">
                <span className="font-mono text-gray-400">{inc.id.slice(0, 8)}</span> — {inc.incident_type} ({inc.severity})
                <span className="text-gray-400 ml-2">Resolved: {inc.resolved_at ? new Date(inc.resolved_at).toLocaleString() : 'N/A'}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
