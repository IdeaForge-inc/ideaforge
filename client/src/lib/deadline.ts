export type DeadlineTone = 'overdue' | 'soon' | 'normal';

export interface DeadlineInfo {
  tone: DeadlineTone;
  label: string;       // короткий статус: «Просрочено», «Сегодня», «2 дня»
  dateLabel: string;   // дата сдачи в читаемом виде
}

const DAY = 86_400_000;

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export function deadlineInfo(dueAt?: number | null): DeadlineInfo | null {
  if (!dueAt) return null;
  const now = Date.now();
  const diff = dueAt - now;
  const dateLabel = new Date(dueAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  if (diff < 0) {
    const days = Math.ceil(-diff / DAY);
    return { tone: 'overdue', label: days <= 1 ? 'Просрочено' : `Просрочено на ${days} ${plural(days, 'день', 'дня', 'дней')}`, dateLabel };
  }
  const days = Math.floor(diff / DAY);
  if (days === 0) return { tone: 'soon', label: 'Сегодня', dateLabel };
  if (days === 1) return { tone: 'soon', label: 'Завтра', dateLabel };
  const tone: DeadlineTone = days <= 3 ? 'soon' : 'normal';
  return { tone, label: `${days} ${plural(days, 'день', 'дня', 'дней')}`, dateLabel };
}

/** Преобразовать значение <input type="date"> в timestamp конца дня (23:59). */
export function dateInputToTimestamp(value: string): number | null {
  if (!value) return null;
  const d = new Date(value + 'T23:59:59');
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}
