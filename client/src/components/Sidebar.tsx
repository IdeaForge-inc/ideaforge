import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import { useUser, initials, nameGradient, logout } from '../lib/user';

const baseLinks = [
  { to: '/', label: 'Генерация', icon: 'M12 3v18M3 12h18' },
  { to: '/history', label: 'История', icon: 'M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-3' },
  { to: '/groups', label: 'Группы', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { to: '/profile', label: 'Профиль', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/" onClick={onNavigate} className="group/brand flex items-center gap-3 rounded-[12px] -m-1 p-1 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]" aria-label="На главную">
      <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-glow transition-transform duration-200 group-hover/brand:scale-105">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>
      <div>
        <div className="font-display font-bold text-[16px] text-[#1D1D1F] dark:text-[#ECECF1] tracking-tight transition-colors group-hover/brand:text-brand-500 dark:group-hover/brand:text-brand-300">IdeaForge</div>
        <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8EA0]">Генератор проектов</div>
      </div>
    </Link>
  );
}

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const { mode, toggle } = useTheme();
  const themeLabel = mode === 'system' ? 'Тема: системная' : mode === 'light' ? 'Тема: светлая' : 'Тема: тёмная';
  const { user } = useUser();

  return (
    <>
      <button
        onClick={() => { onNavigate?.(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true })); }}
        className="mb-3 flex items-center gap-2.5 rounded-[12px] border border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2 text-sm text-[#6E6E73] dark:text-[#8E8EA0] hover:border-brand-500/40 hover:text-brand-500 transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <span className="flex-1 text-left">Поиск…</span>
        <kbd className="text-[10px] font-medium border border-black/[0.1] dark:border-white/[0.12] rounded-[5px] px-1.5 py-0.5">⌘K</kbd>
      </button>

      <nav className="flex flex-col gap-0.5">
        {baseLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group/nav relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-brand-500/12 text-brand-500 dark:text-brand-300'
                : 'text-[#3A3A3C] dark:text-[#C8C8D4] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover/nav:scale-110">
                  <path d={l.icon} />
                </svg>
                {l.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="mt-6 px-2 py-2 flex items-center gap-2.5 rounded-[12px] bg-[#F2F3F7] dark:bg-ink-800 border border-black/[0.04] dark:border-white/[0.05]">
          <div className="w-8 h-8 rounded-[10px] grid place-items-center text-white text-xs font-bold shrink-0" style={{ backgroundImage: nameGradient(user.username) }}>
            {initials(user.username)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#ECECF1] truncate">{user.username}</div>
            <div className="text-[10px] uppercase tracking-wider text-[#6E6E73] dark:text-[#8E8EA0]">{user.role === 'teacher' ? 'Преподаватель' : 'Студент'}</div>
          </div>
          <button
            onClick={() => { if (confirm('Выйти из аккаунта? Данные останутся в БД, но устройство забудет вас.')) logout(); }}
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[#AEAEB2] hover:bg-red-500/10 hover:text-red-500 transition-colors"
            title="Выйти"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      )}

      <button
        onClick={toggle}
        className="mt-auto flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium text-[#6E6E73] dark:text-[#8E8EA0] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all duration-150"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          {mode === 'system'
            ? <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>
            : mode === 'light'
              ? <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
              : <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          }
        </svg>
        {themeLabel}
      </button>
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const activeLabel = baseLinks.find((l) => (l.to === '/' ? pathname === '/' : pathname.startsWith(l.to)))?.label ?? 'IdeaForge';

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-60 shrink-0 border-r border-black/[0.05] dark:border-white/[0.06] bg-white/65 dark:bg-ink-900/65 backdrop-blur-xl p-4 hidden md:flex flex-col">
        <div className="mb-8 px-2"><Brand /></div>
        <NavBody />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 border-b border-black/[0.05] dark:border-white/[0.06] bg-white/70 dark:bg-ink-900/70 backdrop-blur-xl">
        <button onClick={() => setOpen(true)} className="w-9 h-9 -ml-1 rounded-[10px] grid place-items-center text-[#1D1D1F] dark:text-[#ECECF1] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors" aria-label="Меню">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span className="text-[15px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">{activeLabel}</span>
        <div className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-md" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 h-full w-72 max-w-[82vw] flex flex-col p-4 border-r border-white/10 bg-white/85 dark:bg-ink-900/90 backdrop-blur-2xl shadow-apple-lg animate-[toastIn_360ms_cubic-bezier(0.16,1,0.3,1)_both]"
            style={{ animationName: 'fadeInUp' }}
          >
            <div className="mb-8 px-2 flex items-center justify-between">
              <Brand onNavigate={() => setOpen(false)} />
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-[9px] grid place-items-center text-[#AEAEB2] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]" aria-label="Закрыть">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <NavBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
