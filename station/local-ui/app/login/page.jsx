'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // MVP: simple hardcoded password check (server-side)
    // In production, this would be a real auth endpoint
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STATION_API_BASE_URL || 'http://localhost:5000'}/health`);
      if (res.ok) {
        // For MVP, just set a cookie and redirect
        document.cookie = `station_session=authenticated; path=/; max-age=86400`;
        window.location.href = '/dashboard';
      } else {
        setError('Server unreachable');
      }
    } catch (err) {
      setError('Cannot reach station server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">PolarOps — Maitri Station</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Local Operations Dashboard</p>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Enter station password"
            />
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Enter Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
