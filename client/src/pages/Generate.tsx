import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Assignment, GenerateParams, Idea } from '../lib/types';
import { api } from '../lib/user';
import { useToast } from '../lib/toast';
import { IdeaMarkdown } from '../components/IdeaMarkdown';
import { SubmissionPanel } from '../components/SubmissionPanel';
import { DeadlineBadge } from '../components/DeadlineBadge';

const PROJECT_TYPES = ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'Desktop', 'CLI', 'Bot', 'API'];
const DIFFICULTIES = ['Новичок', 'Средний', 'Продвинутый', 'Эксперт'];
const TEAM_SIZES = ['1', '2-3', '4-5', '6-10'];
const TIMES = ['1 день', '3 дня', '1 неделя', '2 недели', '1 месяц', '3 месяца'];
const DOMAINS = ['E-commerce', 'Соцсеть', 'Образование', 'Инструменты', 'Игры', 'Финансы', 'Здоровье', 'Недвижимость', 'Логистика', 'Другое'];
const TECH = ['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Node.js', 'Python', 'Django', 'FastAPI', 'Flask', 'Go', 'Rust', 'Java', 'Spring', 'C#', '.NET', 'PHP', 'Laravel', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'TypeScript', 'Tailwind', 'Docker', 'Kubernetes', 'GraphQL', 'tRPC', 'Prisma'];
const LANGUAGES = ['Русский', 'English', 'Español', 'Deutsch', 'Français'];

const DEFAULTS: GenerateParams = {
  projectType: 'Fullstack',
  difficulty: 'Средний',
  teamSize: '1',
  timeToComplete: '1 неделя',
  domain: 'Инструменты',
  techStack: ['React', 'Node.js'],
  customTech: '',
  language: 'Русский',
  customLanguage: '',
  extraRequirements: '',
};

export default function Generate() {
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<Idea | null>(null);
  const [submissionChecked, setSubmissionChecked] = useState(false);
  const [regenerate, setRegenerate] = useState(false);
  const [params, setParams] = useState<GenerateParams>(DEFAULTS);
  const [customType, setCustomType] = useState('');
  const [customDifficulty, setCustomDifficulty] = useState('');
  const [customTeam, setCustomTeam] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState('');
  const [lastSavedIdea, setLastSavedIdea] = useState<Idea | null>(null);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (!assignmentId) { setSubmissionChecked(true); return; }
    setSubmissionChecked(false);
    Promise.all([
      api(`/api/assignments/${assignmentId}`).then((r) => r.ok ? r.json() : null),
      api(`/api/assignments/${assignmentId}/my-submission`).then((r) => r.ok ? r.json() : { idea: null }),
    ]).then(([a, sub]) => {
      if (a) {
        setAssignment(a.assignment);
        setParams((p) => {
          const ap = a.assignment.params || {};
          return {
            ...p,
            ...ap,
            techStack: Array.isArray(ap.techStack) ? ap.techStack : p.techStack,
            customTech: ap.customTech ?? p.customTech,
          };
        });
      }
      setExistingSubmission(sub.idea || null);
      setSubmissionChecked(true);
    });
  }, [assignmentId]);

  const showExisting = assignment && existingSubmission && !regenerate;

  function update<K extends keyof GenerateParams>(key: K, value: GenerateParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function toggleTech(tech: string) {
    setParams((p) => ({
      ...p,
      techStack: p.techStack.includes(tech)
        ? p.techStack.filter((t) => t !== tech)
        : [...p.techStack, tech],
    }));
  }

  function buildFinalParams(): GenerateParams {
    return {
      ...params,
      projectType: customType.trim() || params.projectType,
      difficulty: customDifficulty.trim() || params.difficulty,
      teamSize: customTeam.trim() || params.teamSize,
      timeToComplete: customTime.trim() || params.timeToComplete,
      domain: customDomain.trim() || params.domain,
      language: params.customLanguage.trim() || params.language,
    };
  }

  async function generate() {
    setStreaming(true);
    setOutput('');
    setError('');
    setLastSavedIdea(null);
    try {
      const finalParams = buildFinalParams();
      const res = await api('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: assignmentId ? Number(assignmentId) : null, ...finalParams }),
      });
      if (!res.ok || !res.body) throw new Error('Запрос не выполнен');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          const lines = block.split('\n');
          const eventLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.slice(6).trim();
          const data = JSON.parse(dataLine.slice(5).trim());

          if (event === 'token') {
            full += data.chunk;
            setOutput(full);
          } else if (event === 'done') {
            toast.show('Идея сохранена в историю', 'success');
            if (data.idea) {
              setLastSavedIdea(data.idea);
              if (assignmentId) {
                setExistingSubmission(data.idea);
                setRegenerate(false);
              }
            }
          } else if (event === 'error') {
            setError(data.message);
            toast.show(data.message, 'error');
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
      toast.show(e.message, 'error');
    } finally {
      setStreaming(false);
    }
  }

  if (assignment && !submissionChecked) {
    return <div className="card p-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8EA0]">Загрузка...</div>;
  }

  // --- Если есть существующая сдача и не идёт перегенерация — показываем её ---
  if (showExisting && existingSubmission) {
    return (
      <div className="space-y-4 max-w-4xl">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">
              📝 {assignment?.title}
            </h1>
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0] mt-1">
              Вы уже сдали это задание {new Date(existingSubmission.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}.
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm('Сгенерировать заново? Старая сдача останется в истории, но обнулится прогресс.')) {
                setRegenerate(true);
                setOutput('');
                setLastSavedIdea(null);
              }
            }}
            className="btn-outline"
          >
            🔄 Сгенерировать заново
          </button>
        </header>

        {assignment?.description && (
          <div className="card p-4 text-sm text-[#3A3A3C] dark:text-[#C8C8D4] whitespace-pre-wrap bg-amber-50/30 dark:bg-amber-500/5 border-amber-500/30">
            {assignment.description}
          </div>
        )}

        <SubmissionPanel idea={existingSubmission} onUpdate={setExistingSubmission} />

        <div className="card p-6">
          <IdeaMarkdown content={existingSubmission.content} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5">
      <section className="card p-6 h-fit space-y-6">
        <header>
          <h1 className="text-[26px] font-bold tracking-tight text-gradient">
            {assignment ? 'Задание' : 'Новая идея'}
          </h1>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0] mt-1">
            {assignment ? 'Параметры заданы преподавателем и зафиксированы. Выберите язык и при желании добавьте детали.' : 'Настройте параметры и получите готовое техническое задание.'}
          </p>
        </header>

        {assignment && (
          <div className="rounded-[12px] bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-semibold text-amber-700 dark:text-amber-300">{assignment.title}</div>
              <DeadlineBadge dueAt={assignment.dueAt} />
            </div>
            {assignment.description && <div className="text-amber-700/80 dark:text-amber-300/80 whitespace-pre-wrap">{assignment.description}</div>}
          </div>
        )}

        <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />

        {assignment && <LockedParams params={params} />}

        {!assignment && (<>
        <div>
          <label className="field">Тип проекта</label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {PROJECT_TYPES.map((t) => (
              <button key={t} onClick={() => { update('projectType', t); setCustomType(''); }}
                className={`chip ${params.projectType === t && !customType ? 'chip-active' : ''}`}>{t}</button>
            ))}
          </div>
          <input className="input" placeholder="Свой вариант — например, Chrome Extension" value={customType} onChange={(e) => setCustomType(e.target.value)} />
        </div>

        <div>
          <label className="field">Сложность</label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {DIFFICULTIES.map((t) => (
              <button key={t} onClick={() => { update('difficulty', t); setCustomDifficulty(''); }}
                className={`chip ${params.difficulty === t && !customDifficulty ? 'chip-active' : ''}`}>{t}</button>
            ))}
          </div>
          <input className="input" placeholder="Свой уровень — например, Junior+" value={customDifficulty} onChange={(e) => setCustomDifficulty(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field">Команда</label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {TEAM_SIZES.map((t) => (
                <button key={t} onClick={() => { update('teamSize', t); setCustomTeam(''); }}
                  className={`chip ${params.teamSize === t && !customTeam ? 'chip-active' : ''}`}>
                  {t === '1' ? 'Соло' : `${t} чел.`}
                </button>
              ))}
            </div>
            <input className="input" placeholder="Своё" value={customTeam} onChange={(e) => setCustomTeam(e.target.value)} />
          </div>
          <div>
            <label className="field">Срок</label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {TIMES.map((t) => (
                <button key={t} onClick={() => { update('timeToComplete', t); setCustomTime(''); }}
                  className={`chip ${params.timeToComplete === t && !customTime ? 'chip-active' : ''}`}>{t}</button>
              ))}
            </div>
            <input className="input" placeholder="Своё" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="field">Область</label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {DOMAINS.map((d) => (
              <button key={d} onClick={() => { update('domain', d); setCustomDomain(''); }}
                className={`chip ${params.domain === d && !customDomain ? 'chip-active' : ''}`}>{d}</button>
            ))}
          </div>
          <input className="input" placeholder="Своя область — например, Кибербезопасность" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} />
        </div>

        <div>
          <label className="field">Стек <span className="normal-case font-normal text-[#AEAEB2]">({params.techStack.length} выбрано)</span></label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {TECH.map((t) => (
              <button key={t} onClick={() => toggleTech(t)}
                className={`chip ${params.techStack.includes(t) ? 'chip-active' : ''}`}>{t}</button>
            ))}
          </div>
          <input className="input" placeholder="Свои технологии через запятую — Elixir, Phoenix..." value={params.customTech} onChange={(e) => update('customTech', e.target.value)} />
        </div>
        </>)}

        <div>
          <label className="field">Язык ответа</label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {LANGUAGES.map((l) => (
              <button key={l} onClick={() => { update('language', l); update('customLanguage', ''); }}
                className={`chip ${params.language === l && !params.customLanguage ? 'chip-active' : ''}`}>{l}</button>
            ))}
          </div>
          <input className="input" placeholder="Другой язык" value={params.customLanguage} onChange={(e) => update('customLanguage', e.target.value)} />
        </div>

        <div>
          <label className="field">Дополнительно</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Особенности архитектуры, целевая аудитория, ограничения..."
            value={params.extraRequirements}
            onChange={(e) => update('extraRequirements', e.target.value)}
          />
        </div>

        <button onClick={generate} disabled={streaming} className="btn-gradient w-full h-12 text-[15px] font-medium tracking-[-0.01em]">
          {streaming ? (
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" style={{ animationDuration: '0.8s' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Генерация...
            </span>
          ) : '✦ Сгенерировать'}
        </button>
      </section>

      <section className="card p-6 min-h-[500px] flex flex-col">
        {!output && !streaming && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 animate-fade-in">
            <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-brand-500/20 to-brand-300/5 ring-1 ring-brand-500/15 flex items-center justify-center mb-5 animate-float">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4D6BFE" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#ECECF1] tracking-tight">Здесь появится идея</h2>
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0] mt-2 max-w-xs leading-relaxed">Настройте параметры слева и нажмите «Сгенерировать». Результат стримится в реальном времени.</p>
          </div>
        )}

        {streaming && !output && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-[16px] bg-brand-500/10 ring-1 ring-brand-500/15 flex items-center justify-center mb-5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4D6BFE" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ animationDuration: '2s' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#ECECF1] tracking-tight">Генерация идеи</h2>
            <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0] mt-2 max-w-xs leading-relaxed">ИИ прорабатывает архитектуру, стек и дорожную карту. Обычно занимает 1–3 минуты.</p>
            <div className="flex gap-1.5 mt-5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {output && (
          <div className="animate-fade-in">
            <IdeaMarkdown content={output} />
            {streaming && <span className="inline-block w-[2px] h-[1.1em] -mb-[0.15em] ml-0.5 bg-brand-500 animate-pulse rounded-full align-middle" />}
          </div>
        )}
        {lastSavedIdea && assignmentId && !streaming && (
          <div className="mt-5">
            <SubmissionPanel idea={lastSavedIdea} onUpdate={setLastSavedIdea} />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 rounded-[10px] bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 mt-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}
      </section>
    </div>
  );
}

/** Параметры задания, заданные преподавателем — только для чтения. */
function LockedParams({ params }: { params: GenerateParams }) {
  const techs = [
    ...(params.techStack || []),
    ...(params.customTech || '').split(',').map((s) => s.trim()).filter(Boolean),
  ];
  const rows: { label: string; value?: string }[] = [
    { label: 'Тип проекта', value: params.projectType },
    { label: 'Сложность', value: params.difficulty },
    { label: 'Команда', value: params.teamSize === '1' ? 'Соло' : params.teamSize ? `${params.teamSize} чел.` : undefined },
    { label: 'Трудоёмкость', value: params.timeToComplete },
    { label: 'Область', value: params.domain },
  ].filter((r) => r.value);

  return (
    <div className="rounded-[14px] border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6E6E73] dark:text-[#8E8EA0]">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6E6E73] dark:text-[#8E8EA0]">Параметры заданы преподавателем</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-[10px] uppercase tracking-wide text-[#AEAEB2] dark:text-[#5A5C66]">{r.label}</dt>
            <dd className="text-sm font-medium text-[#1D1D1F] dark:text-[#ECECF1]">{r.value}</dd>
          </div>
        ))}
      </dl>
      {techs.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-[#AEAEB2] dark:text-[#5A5C66] mb-1.5">Стек</div>
          <div className="flex flex-wrap gap-1.5">
            {techs.map((t) => (
              <span key={t} className="rounded-full bg-brand-500/10 text-brand-500 dark:text-brand-300 border border-brand-500/20 px-2.5 py-1 text-xs font-medium">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
