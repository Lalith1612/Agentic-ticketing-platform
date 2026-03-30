import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('showspot_token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('showspot_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('showspot_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  }, []);

  const register = useCallback(async (name, email, password, city) => {
    const res = await api.post('/auth/register', { name, email, password, city });
    localStorage.setItem('showspot_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('showspot_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
