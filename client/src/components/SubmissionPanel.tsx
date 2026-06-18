import { useState, useEffect, useMemo } from 'react';
import { Idea, SubmissionStatus } from '../lib/types';
import { api } from '../lib/user';
import { useToast } from '../lib/toast';

const STATUS_META: Record<SubmissionStatus, { label: string; dot: string; text: string; bg: string }> = {
  not_started: { label: 'Не начато', dot: 'bg-[#AEAEB2]', text: 'text-[#6E6E73] dark:text-[#8E8EA0]', bg: 'bg-black/[0.05] dark:bg-white/[0.08]' },
  in_progress: { label: 'В работе', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/12' },
  done: { label: 'Готово', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/12' },
};

function isValidRepoUrl(url: string): boolean {
  const v = (url || '').trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function SubmissionPanel({ idea, onUpdate }: { idea: Idea; onUpdate: (idea: Idea) => void }) {
  const toast = useToast();
  const [repoUrl, setRepoUrl] = useState(idea.repoUrl);
  const [studentNote, setStudentNote] = useState(idea.studentNote);
  const [markDone, setMarkDone] = useState(idea.submissionStatus === 'done');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRepoUrl(idea.repoUrl);
    setStudentNote(idea.studentNote);
    setMarkDone(idea.submissionStatus === 'done');
  }, [idea.id, idea.submissionStatus, idea.repoUrl, idea.studentNote]);

  const repoValid = useMemo(() => isValidRepoUrl(repoUrl), [repoUrl]);
  const repoTouched = repoUrl.trim().length > 0;
  const hasWork = repoValid || studentNote.trim().length > 0;

  // Статус выводится автоматически из состояния, кроме «Готово» — его ставит пользователь.
  const computedStatus: SubmissionStatus = markDone && repoValid ? 'done' : hasWork ? 'in_progress' : 'not_started';
  const meta = STATUS_META[computedStatus];

  const dirty =
    repoUrl !== idea.repoUrl ||
    studentNote !== idea.studentNote ||
    computedStatus !== idea.submissionStatus;

  async function save() {
    if (markDone && !repoValid) {
      toast.show(
        repoTouched
          ? 'Некорректная ссылка на репозиторий — нужен http(s)-адрес'
          : 'Чтобы отметить «Готово», добавьте ссылку на репозиторий',
        'error',
      );
      return;
    }
    setSaving(true);
    const res = await api(`/api/history/${idea.id}/submission`, {
      method: 'PATCH',
      body: JSON.stringify({ status: computedStatus, repoUrl, studentNote }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.show(body?.message || 'Не удалось сохранить', 'error');
      return;
    }
    const { idea: updated } = await res.json();
    onUpdate(updated);
    setMarkDone(updated.submissionStatus === 'done');
    toast.show('Сохранено', 'success');
  }

  return (
    <div className="card p-5 space-y-5 border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/[0.06] animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[15px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">📝 Моя сдача</h3>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.bg} ${meta.text} transition-colors duration-300`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <p className="text-xs text-[#6E6E73] dark:text-[#8E8EA0] -mt-1.5 leading-relaxed">
        Статус меняется автоматически: «В работе» — как только добавлена ссылка или комментарий. «Готово» отметьте сами, когда уверены, что всё сделано.
      </p>

      <div>
        <label className="field">Ссылка на репозиторий / демо</label>
        <div className="relative">
          <input
            className={`input pr-10 transition-all ${
              repoTouched && !repoValid
                ? '!border-red-400 focus:!ring-red-400/30 focus:!border-red-400'
                : repoValid
                ? '!border-emerald-400/60 focus:!ring-emerald-400/30'
                : ''
            }`}
            placeholder="https://github.com/you/project"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          {repoTouched && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
              {repoValid ? '✅' : '⚠️'}
            </span>
          )}
        </div>
        {repoTouched && !repoValid && (
          <p className="text-xs text-red-500 mt-1.5 animate-fade-in">Введите корректную ссылку (http:// или https://).</p>
        )}
      </div>

      <div>
        <label className="field">Комментарий студента</label>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder="Что получилось, что не успел, что узнал..."
          value={studentNote}
          onChange={(e) => setStudentNote(e.target.value)}
        />
      </div>

      <label
        className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 cursor-pointer transition-all duration-200 ${
          markDone && repoValid
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : 'border-black/[0.08] dark:border-white/[0.10] hover:border-emerald-500/30'
        } ${!repoValid ? 'opacity-70' : ''}`}
        title={!repoValid ? 'Сначала добавьте корректную ссылку на репозиторий' : undefined}
      >
        <input
          type="checkbox"
          className="sr-only peer"
          checked={markDone}
          disabled={!repoValid && !markDone}
          onChange={(e) => {
            if (!repoValid) {
              toast.show('Чтобы отметить «Готово», добавьте ссылку на репозиторий', 'error');
              return;
            }
            setMarkDone(e.target.checked);
          }}
        />
        <span className={`w-5 h-5 rounded-[7px] grid place-items-center border transition-all duration-200 ${
          markDone && repoValid ? 'bg-emerald-500 border-emerald-500' : 'border-black/20 dark:border-white/25'
        }`}>
          {markDone && repoValid && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </span>
        <div className="flex-1">
          <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#ECECF1]">Отметить как «Готово»</div>
          <div className="text-xs text-[#6E6E73] dark:text-[#8E8EA0]">{repoValid ? 'Работа завершена и залита' : 'Доступно после добавления ссылки на репозиторий 🔒'}</div>
        </div>
      </label>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-[#6E6E73] dark:text-[#8E8EA0]">
          {dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}
        </span>
        <button onClick={save} disabled={saving || !dirty} className="btn-primary text-xs !py-2 !px-4">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {idea.grade !== null && (
        <div className="rounded-[12px] bg-white dark:bg-[#1B1D23] border border-black/[0.06] dark:border-white/[0.08] p-4 mt-1 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6E6E73] dark:text-[#8E8EA0]">Оценка преподавателя</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`text-lg ${n <= (idea.grade || 0) ? 'text-amber-500' : 'text-[#E5E5EA] dark:text-[#3A3A3C]'}`}>★</span>
              ))}
            </div>
            <span className="text-[12px] text-[#6E6E73] dark:text-[#8E8EA0] ml-auto">
              {idea.gradedAt && new Date(idea.gradedAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
          {idea.teacherFeedback && (
            <p className="text-sm text-[#3A3A3C] dark:text-[#C8C8D4] whitespace-pre-wrap">{idea.teacherFeedback}</p>
          )}
        </div>
      )}
    </div>
  );
}
