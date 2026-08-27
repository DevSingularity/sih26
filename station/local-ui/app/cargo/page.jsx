'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/apiClient';

export default function CargoPage() {
  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/cargo')
      .then(setCargo)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading cargo...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Cargo & Inventory</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Shipments</h2>
        {cargo.shipments.length === 0 ? (
          <p className="text-gray-400">No shipments recorded</p>
        ) : (
          <div className="space-y-3">
            {cargo.shipments.map(s => (
              <div key={s.id} className="border rounded p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-mono text-sm text-gray-500">{s.shipment_code}</span>
                    <span className="ml-2 font-semibold">{s.origin || 'Unknown origin'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    s.status === 'received' ? 'bg-green-100 text-green-800' :
                    s.status === 'delayed' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {s.status}
                  </span>
                </div>
                {s.mode && <p className="text-xs text-gray-500 mt-1">Mode: {s.mode}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Items</h2>
        {cargo.items.length === 0 ? (
          <p className="text-gray-400">No items recorded</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {cargo.items.map(item => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.item_name}</td>
                  <td className="py-2 text-gray-500">{item.category || '—'}</td>
                  <td className="text-right py-2">{item.quantity} {item.unit || ''}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      item.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      item.status === 'verified' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
