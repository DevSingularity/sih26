'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/apiClient';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/dashboard/summary')
      .then(setSummary)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Maitri Station Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Cargo by Status */}
        <div className="border rounded p-6">
          <h2 className="text-lg font-semibold mb-4">Cargo Activity Today</h2>
          {summary.cargo_by_status.length === 0 ? (
            <p className="text-gray-400">No cargo activity today</p>
          ) : (
            <div className="space-y-2">
              {summary.cargo_by_status.map(row => (
                <div key={row.status} className="flex justify-between">
                  <span className="capitalize">{row.status}</span>
                  <span className="font-bold">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checked-in Personnel */}
        <div className="border rounded p-6">
          <h2 className="text-lg font-semibold mb-4">Checked-In Personnel</h2>
          {summary.checked_in_personnel.length === 0 ? (
            <p className="text-gray-400">No one currently checked in</p>
          ) : (
            <div className="space-y-2">
              {summary.checked_in_personnel.map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.full_name}</span>
                  <span className="text-gray-500">{p.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inventory Levels */}
      <div className="border rounded p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Inventory Levels</h2>
        {summary.inventory_levels.length === 0 ? (
          <p className="text-gray-400">No inventory data</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Category</th>
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Reorder At</th>
              </tr>
            </thead>
            <tbody>
              {summary.inventory_levels.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{item.item_category}</td>
                  <td className="py-2">{item.item_name}</td>
                  <td className="text-right py-2">{item.quantity_on_hand} {item.unit}</td>
                  <td className={`text-right py-2 ${item.reorder_threshold && item.quantity_on_hand <= item.reorder_threshold ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                    {item.reorder_threshold || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Resource Usage Today */}
      <div className="border rounded p-6">
        <h2 className="text-lg font-semibold mb-4">Resource Usage Today</h2>
        {summary.resource_usage_today.length === 0 ? (
          <p className="text-gray-400">No resource usage logged today</p>
        ) : (
          <div className="space-y-2">
            {summary.resource_usage_today.map((r, i) => (
              <div key={i} className="flex justify-between">
                <span className="capitalize">{r.usage_type}</span>
                <span className="font-bold">{r.total_quantity} {r.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
