/* oxlint-disable react/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axiosClient from '@/lib/axios-client';
import type { User, AuthResponse } from '@/types/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axiosClient.get('/user')
        .then((res) => setUser(res.data.data || res.data.user))
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await axiosClient.post<AuthResponse>('/auth/login', { email, password });
    const { token: newToken, refreshToken } = res.data.data;
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('refresh_token', refreshToken);
    setToken(newToken);
    setUser(res.data.user);
  };

  const register = async (data: { name: string; email: string; password: string }) => {
    const res = await axiosClient.post<AuthResponse>('/auth/register', data);
    const { token: newToken, refreshToken } = res.data.data;
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('refresh_token', refreshToken);
    setToken(newToken);
    setUser(res.data.user);
  };

  const logout = () => {
    axiosClient.post('/auth/logout').catch(() => {});
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
