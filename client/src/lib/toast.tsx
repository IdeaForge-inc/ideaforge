import { createContext, useCallback, useContext, useState, useRef, ReactNode } from 'react';

type Tone = 'info' | 'success' | 'error';
interface ToastAction { label: string; onClick: () => void }
interface ToastOpts { action?: ToastAction; duration?: number }
interface Toast { id: number; message: string; tone: Tone; action?: ToastAction; duration: number; leaving?: boolean }
interface Ctx { show: (msg: string, tone?: Tone, opts?: ToastOpts) => void }

const ToastCtx = createContext<Ctx>({ show: () => {} });
export const useToast = () => useContext(ToastCtx);

const DURATION = 4000;
const MAX_VISIBLE = 3;     // видимых карточек в свёрнутой стопке
const PEEK = 10;           // насколько выглядывает каждая задняя (px)
const SCALE_STEP = 0.05;   // уменьшение каждой задней

const TONES: Record<Tone, { rail: string; iconWrap: string; glow: string; icon: ReactNode }> = {
  success: {
    rail: 'from-emerald-400 to-teal-500',
    iconWrap: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-300 ring-emerald-500/25',
    glow: 'rgba(16,185,129,0.30)',
    icon: <path d="M20 6 9 17l-5-5" />,
  },
  error: {
    rail: 'from-rose-400 to-red-500',
    iconWrap: 'bg-rose-500/15 text-rose-500 dark:text-rose-300 ring-rose-500/25',
    glow: 'rgba(244,63,94,0.30)',
    icon: <><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  },
  info: {
    rail: 'from-brand-400 to-brand-600',
    iconWrap: 'bg-brand-500/15 text-brand-500 dark:text-brand-300 ring-brand-500/25',
    glow: 'rgba(77,107,254,0.32)',
    icon: <><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const [expanded, setExpanded] = useState(false);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: number) => {
    const tm = timers.current.get(id);
    if (tm) { clearTimeout(tm); timers.current.delete(id); }
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 320);
    clearTimer(id);
  }, [clearTimer]);

  const arm = useCallback((id: number, ms: number) => {
    clearTimer(id);
    timers.current.set(id, setTimeout(() => dismiss(id), ms));
  }, [dismiss, clearTimer]);

  const show = useCallback((message: string, tone: Tone = 'info', opts?: ToastOpts) => {
    const id = Date.now() + Math.random();
    const duration = opts?.duration ?? (opts?.action ? 6000 : DURATION);
    setItems((prev) => [...prev, { id, message, tone, action: opts?.action, duration }]);
    arm(id, duration);
  }, [arm]);

  // Новейшая карточка — сверху стопки (index 0 = передняя).
  const ordered = [...items].reverse();

  const onEnter = () => { setExpanded(true); items.forEach((t) => clearTimer(t.id)); };
  const onLeave = () => { setExpanded(false); items.forEach((t) => { if (!t.leaving) arm(t.id, 1800); }); };

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-3 w-[min(92vw,360px)] pointer-events-none"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {ordered.map((t, i) => {
          const cfg = TONES[t.tone];
          const hidden = !expanded && i >= MAX_VISIBLE;
          // Свёрнуто: накладываем карточки друг на друга (отрицательный margin),
          // задние слегка приподняты, уменьшены и притушены.
          const collapsedStyle: React.CSSProperties = {
            marginTop: i === 0 ? 0 : -64 + PEEK,         // нахлёст
            transform: `scale(${1 - i * SCALE_STEP})`,
            transformOrigin: 'top center',
            opacity: hidden ? 0 : Math.max(0, 1 - i * 0.16),
            zIndex: 100 - i,
            filter: i > 0 ? 'saturate(0.9)' : undefined,
          };
          const expandedStyle: React.CSSProperties = {
            marginTop: 0,
            transform: 'scale(1)',
            opacity: 1,
            zIndex: 100 - i,
          };

          return (
            <div
              key={t.id}
              className={`w-full transition-all duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hidden ? 'pointer-events-none' : 'pointer-events-auto'} ${t.leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
              style={expanded ? expandedStyle : collapsedStyle}
            >
              <ToastCard t={t} cfg={cfg} paused={expanded} onDismiss={() => dismiss(t.id)} />
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({
  t, cfg, paused, onDismiss,
}: { t: Toast; cfg: typeof TONES[Tone]; paused: boolean; onDismiss: () => void }) {
  return (
    <div
      role="status"
      onClick={() => { if (!t.action) onDismiss(); }}
      className={`group relative overflow-hidden rounded-[16px] ${t.action ? '' : 'cursor-pointer'}
        border border-white/40 dark:border-white/[0.08]
        bg-white/75 dark:bg-ink-850/75 backdrop-blur-2xl
        transition-transform duration-200 hover:-translate-y-0.5`}
      style={{ boxShadow: `0 12px 36px ${cfg.glow}, 0 1px 0 0 rgba(255,255,255,0.25) inset` }}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cfg.rail} opacity-[0.07]`} />
      <div className={`absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b ${cfg.rail}`} />

      <div className="relative flex items-start gap-3 px-4 py-3.5 pl-5">
        <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 ${cfg.iconWrap}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {cfg.icon}
          </svg>
        </span>
        <p className="flex-1 pt-0.5 text-[13.5px] font-medium leading-snug text-[#1D1D1F] dark:text-[#ECECF1]">
          {t.message}
        </p>
        {t.action ? (
          <button
            onClick={(e) => { e.stopPropagation(); t.action!.onClick(); onDismiss(); }}
            className="shrink-0 -mt-0.5 rounded-full px-3 py-1.5 text-xs font-semibold text-brand-500 dark:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 active:scale-95 transition"
          >
            {t.action.label}
          </button>
        ) : (
          <span className="mt-0.5 text-[#AEAEB2] opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:text-[#5A5C66]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 h-[2.5px] w-full origin-left bg-black/[0.05] dark:bg-white/[0.06]">
        <div
          className={`h-full origin-left bg-gradient-to-r ${cfg.rail} ${t.leaving ? '' : 'animate-toast-progress'} ${paused ? '[animation-play-state:paused]' : ''}`}
          style={{ animationDuration: `${t.duration}ms` }}
        />
      </div>
    </div>
  );
}
