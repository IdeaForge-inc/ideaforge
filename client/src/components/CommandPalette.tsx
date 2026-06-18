import { useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import { logout } from '../lib/user';

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

const icon = (d: string) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { mode, toggle } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Глобальный хоткей ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => { setOpen(false); setQuery(''); setActive(0); };

  const commands = useMemo<Cmd[]>(() => [
    { id: 'go-generate', label: 'Генерация', hint: 'Новая идея', group: 'Навигация', keywords: 'generate new idea создать', icon: icon('M12 3v18M3 12h18'), run: () => navigate('/') },
    { id: 'go-history', label: 'История', hint: 'Все идеи', group: 'Навигация', keywords: 'history past', icon: icon('M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-3'), run: () => navigate('/history') },
    { id: 'go-groups', label: 'Группы', hint: 'Учебные группы', group: 'Навигация', keywords: 'groups class', icon: icon('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'), run: () => navigate('/groups') },
    { id: 'go-profile', label: 'Профиль', hint: 'Ваш аккаунт', group: 'Навигация', keywords: 'profile account me', icon: icon('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'), run: () => navigate('/profile') },
    { id: 'theme', label: 'Сменить тему', hint: mode === 'system' ? 'Сейчас: системная' : mode === 'light' ? 'Сейчас: светлая' : 'Сейчас: тёмная', group: 'Действия', keywords: 'theme dark light system тема', icon: icon('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'), run: () => toggle() },
    { id: 'logout', label: 'Выйти из аккаунта', group: 'Действия', keywords: 'logout exit выход', icon: icon('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'), run: () => logout() },
  ], [navigate, mode, toggle]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => (c.label + ' ' + (c.hint || '') + ' ' + (c.keywords || '')).toLowerCase().includes(q));
  }, [commands, query]);

  // Сброс активного индекса при изменении выборки
  useEffect(() => { setActive(0); }, [query]);
  // Фокус на инпут при открытии
  useEffect(() => { if (open) requestAnimationFrame(() => inputRef.current?.focus()); }, [open]);

  // Прокрутка активного пункта в зону видимости
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const runAt = (i: number) => { const c = filtered[i]; if (c) { close(); c.run(); } };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); runAt(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  };

  // Группировка с сохранением порядка
  let lastGroup = '';

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[12vh] bg-ink-950/50 backdrop-blur-xl animate-fade-in" onClick={close}>
      <div
        className="card relative w-full max-w-[560px] overflow-hidden ring-1 ring-white/10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
      >
        <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />

        {/* Поиск */}
        <div className="relative flex items-center gap-3 px-4 border-b border-black/[0.06] dark:border-white/[0.07]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#AEAEB2] dark:text-[#5A5C66] shrink-0"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск команд и разделов…"
            className="flex-1 bg-transparent py-4 text-[15px] text-[#1D1D1F] dark:text-[#ECECF1] outline-none placeholder:text-[#AEAEB2] dark:placeholder:text-[#5A5C66]"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-medium text-[#AEAEB2] dark:text-[#5A5C66] border border-black/[0.1] dark:border-white/[0.12] rounded-[6px] px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Список */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8EA0]">Ничего не найдено</div>
          ) : (
            filtered.map((c, i) => {
              const showGroup = c.group !== lastGroup;
              lastGroup = c.group;
              return (
                <div key={c.id}>
                  {showGroup && <div className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#AEAEB2] dark:text-[#5A5C66]">{c.group}</div>}
                  <button
                    data-idx={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => runAt(i)}
                    className={`w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors duration-100
                      ${active === i ? 'bg-brand-500/12 text-brand-500 dark:text-brand-300' : 'text-[#3A3A3C] dark:text-[#C8C8D4]'}`}
                  >
                    <span className={`grid place-items-center w-8 h-8 rounded-[9px] shrink-0 ${active === i ? 'bg-brand-500/15' : 'bg-black/[0.04] dark:bg-white/[0.05]'}`}>{c.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{c.label}</span>
                      {c.hint && <span className="block text-xs text-[#6E6E73] dark:text-[#8E8EA0] truncate">{c.hint}</span>}
                    </span>
                    {active === i && (
                      <span className="text-[10px] font-medium text-brand-500 dark:text-brand-300 border border-brand-500/30 rounded-[6px] px-1.5 py-0.5">↵</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
