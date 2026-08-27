'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, setToken, clearToken, apiPost } from '@/lib/apiClient';

const AuthContext = createContext({ user: null, loading: true, login: async () => {}, logout: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: payload.id, username: payload.username, role: payload.role });
        } else {
          clearToken();
        }
      } catch {
        clearToken();
      }
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const data = await apiPost('/api/auth/login', { username, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
