import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-width class, e.g. "max-w-md" */
  size?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
}

/**
 * Portal-based modal rendered to document.body — избегает клиппинга и кривого
 * позиционирования при вложенных модалках внутри overflow-scroll контейнеров.
 */
export function Modal({ open = true, onClose, children, size = 'max-w-md', title, subtitle }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-950/45 dark:bg-ink-950/70 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`card relative w-full ${size} max-h-[88vh] flex flex-col overflow-hidden shadow-apple-lg animate-scale-in
          ring-1 ring-white/10`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* gradient top-glow */}
        <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-500/[0.06] to-transparent" />
        {(title || subtitle) && (
          <header className="relative flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.07] shrink-0">
            <div className="min-w-0">
              {title && <h3 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">{title}</h3>}
              {subtitle && <p className="text-xs text-[#6E6E73] dark:text-[#8E8EA0] mt-1 truncate">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full grid place-items-center text-[#AEAEB2] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-[#1D1D1F] dark:hover:text-[#ECECF1] transition-colors shrink-0"
              aria-label="Закрыть"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
        )}
        <div className="relative overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
