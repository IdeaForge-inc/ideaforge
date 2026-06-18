import { useSyncExternalStore } from 'react';

const KEY = 'ideaforge:theme';
export type ThemeMode = 'dark' | 'light' | 'system';
type Resolved = 'dark' | 'light';

const mql = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readMode(): ThemeMode {
  const saved = localStorage.getItem(KEY);
  if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  return 'system';
}

function resolve(mode: ThemeMode): Resolved {
  if (mode === 'system') return mql?.matches ? 'dark' : 'light';
  return mode;
}

function apply(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', resolve(mode) === 'dark');
}

// --- простой внешний стор, чтобы все потребители были синхронизированы ---
let currentMode: ThemeMode = readMode();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setMode(mode: ThemeMode) {
  currentMode = mode;
  localStorage.setItem(KEY, mode);
  apply(mode);
  emit();
}

// Живое обновление, когда система меняет тему (актуально для режима 'system')
mql?.addEventListener?.('change', () => { if (currentMode === 'system') { apply(currentMode); emit(); } });

apply(currentMode);

function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
function getSnapshot() { return currentMode; }

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const theme = resolve(mode);
  return {
    mode,
    theme,
    setMode,
    // Циклически: system → light → dark → system
    toggle: () => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'),
  };
}
