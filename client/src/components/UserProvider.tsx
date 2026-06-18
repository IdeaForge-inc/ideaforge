import { useCallback, useEffect, useState, ReactNode } from 'react';
import { UserContext, api, setToken, getToken } from '../lib/user';
import type { User, Role } from '../lib/types';
import { AuthScreen } from './AuthScreen';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try {
      const res = await api('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (data: { login: string; password: string }) => {
    const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Не удалось войти');
    setToken(json.token);
    setUser(json.user);
    return json.user as User;
  }, []);

  const register = useCallback(async (data: { login: string; password: string; displayName: string; role: Role }) => {
    const res = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Не удалось зарегистрироваться');
    setToken(json.token);
    setUser(json.user);
    return json.user as User;
  }, []);

  const updateName = useCallback(async (displayName: string) => {
    const res = await api('/api/users/me', { method: 'PATCH', body: JSON.stringify({ displayName }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Не удалось обновить ник');
    setUser(json.user);
    return json.user as User;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Публичные маршруты (например, просмотр расшаренной идеи) доступны без входа.
  const isPublic = window.location.pathname.startsWith('/share/');
  const gate = !loading && !user && !isPublic;

  return (
    <UserContext.Provider value={{ user, loading, refresh, login, register, updateName }}>
      {gate ? <AuthScreen /> : children}
    </UserContext.Provider>
  );
}
