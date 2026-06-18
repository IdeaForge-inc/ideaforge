import { createContext, useContext } from 'react';
import type { User, Role } from './types';

const TOKEN_KEY = 'ideaforge:token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Централизованный fetch с авто-подстановкой Bearer-токена.
 * Использовать вместо голого fetch для всех /api запросов.
 */
export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(path, { ...init, headers });
}

export async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
  clearToken();
  window.location.href = '/';
}

/** Инициалы для бейджа-аватара (вместо картинок). */
export function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Детерминированный градиент по имени — для цветных бейджей. */
export function nameGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const h2 = (h + 40) % 360;
  return `linear-gradient(135deg, hsl(${h} 70% 58%), hsl(${h2} 70% 50%))`;
}

interface UserContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (data: { login: string; password: string }) => Promise<User>;
  register: (data: { login: string; password: string; displayName: string; role: Role }) => Promise<User>;
  updateName: (displayName: string) => Promise<User>;
}

export const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  login: async () => { throw new Error('UserProvider not mounted'); },
  register: async () => { throw new Error('UserProvider not mounted'); },
  updateName: async () => { throw new Error('UserProvider not mounted'); },
});

export const useUser = () => useContext(UserContext);
