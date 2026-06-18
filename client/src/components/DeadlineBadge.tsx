import { deadlineInfo } from '../lib/deadline';

const STYLES = {
  overdue: 'bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/25',
  soon: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
  normal: 'bg-brand-500/10 text-brand-500 dark:text-brand-300 border-brand-500/20',
} as const;

export function DeadlineBadge({ dueAt, withDate = false }: { dueAt?: number | null; withDate?: boolean }) {
  const info = deadlineInfo(dueAt);
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STYLES[info.tone]}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
      {info.label}
      {withDate && <span className="font-normal opacity-70">· {info.dateLabel}</span>}
    </span>
  );
}
