import { ReactNode } from 'react';

/**
 * Стильное пустое состояние: градиентная иконка-«орб» с подсветкой,
 * заголовок, подпись и опциональное действие.
 */
export function EmptyState({
  icon, title, hint, action,
}: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 animate-fade-in">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-brand-500/30 blur-2xl animate-glow-pulse" />
        <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-brand-400/20 to-brand-600/10 ring-1 ring-brand-500/20 grid place-items-center text-brand-500 dark:text-brand-300 animate-float">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </div>
      </div>
      <h3 className="text-[16px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">{title}</h3>
      {hint && <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0] mt-1.5 max-w-xs leading-relaxed">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
