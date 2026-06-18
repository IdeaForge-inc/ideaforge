import { useEffect, useMemo, useState } from 'react';
import { Idea } from '../lib/types';
import { api } from '../lib/user';
import { useToast } from '../lib/toast';
import { IdeaMarkdown } from '../components/IdeaMarkdown';
import { EmptyState } from '../components/EmptyState';

type SavedFilter = 'all' | 'saved';

export default function History() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [savedFilter, setSavedFilter] = useState<SavedFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const res = await api('/api/history');
    const data = await res.json();
    setIdeas(data.ideas);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleBookmark(id: number) {
    const res = await api(`/api/history/${id}/bookmark`, { method: 'PATCH' });
    const { idea } = await res.json();
    setIdeas((arr) => arr.map((i) => (i.id === id ? idea : i)));
    toast.show(idea.isSaved ? 'Добавлено в закладки' : 'Закладка удалена', 'success');
  }

  function removeIdea(id: number) {
    const victim = ideas.find((i) => i.id === id);
    if (!victim) return;
    // Оптимистично убираем из списка; реальный DELETE — после окна «Отменить».
    setIdeas((arr) => arr.filter((i) => i.id !== id));
    if (expanded === id) setExpanded(null);

    let undone = false;
    const timer = setTimeout(async () => {
      if (undone) return;
      const res = await api(`/api/history/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.show('Не удалось удалить', 'error'); setIdeas((arr) => [victim, ...arr]); }
    }, 6000);

    toast.show('Идея удалена', 'success', {
      action: {
        label: 'Отменить',
        onClick: () => {
          undone = true;
          clearTimeout(timer);
          setIdeas((arr) => arr.some((i) => i.id === id) ? arr : [victim, ...arr].sort((a, b) => b.createdAt - a.createdAt));
        },
      },
    });
  }

  async function share(idea: Idea) {
    let slug = idea.shareSlug;
    if (!slug) {
      const res = await api(`/api/history/${idea.id}/share`, { method: 'POST' });
      if (!res.ok) {
        toast.show('Не удалось создать ссылку', 'error');
        return;
      }
      const data = await res.json();
      slug = data.slug;
      setIdeas((arr) => arr.map((i) => (i.id === idea.id ? { ...i, shareSlug: slug } : i)));
    }
    const url = `${window.location.origin}/share/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.show('Ссылка скопирована', 'success');
    } catch {
      toast.show(url, 'info');
    }
  }

  const types = useMemo(() => [...new Set(ideas.map((i) => i.params?.projectType).filter(Boolean))], [ideas]);
  const diffs = useMemo(() => [...new Set(ideas.map((i) => i.params?.difficulty).filter(Boolean))], [ideas]);

  const filtered = useMemo(() => ideas.filter((i) => {
    if (savedFilter === 'saved' && !i.isSaved) return false;
    if (typeFilter !== 'all' && i.params?.projectType !== typeFilter) return false;
    if (diffFilter !== 'all' && i.params?.difficulty !== diffFilter) return false;
    const q = search.trim().toLowerCase();
    if (q && !(`${i.title} ${i.content}`.toLowerCase().includes(q))) return false;
    return true;
  }), [ideas, savedFilter, typeFilter, diffFilter, search]);

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight text-gradient">История</h1>
        <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0] mt-1">Все сгенерированные идеи.</p>
      </header>

      <div className="relative">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEB2] dark:text-[#5A5C66] pointer-events-none"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          className="input !pl-10 !pr-9"
          placeholder="Поиск по названию и содержанию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full text-[#AEAEB2] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors" aria-label="Очистить">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>

      <div className="card px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          <button onClick={() => setSavedFilter('all')} className={`chip ${savedFilter === 'all' ? 'chip-active' : ''}`}>Все</button>
          <button onClick={() => setSavedFilter('saved')} className={`chip ${savedFilter === 'saved' ? 'chip-active' : ''}`}>Закладки</button>
        </div>
        <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.08]" />
        <select className="input !py-1.5 !text-xs max-w-[150px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">Все типы</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input !py-1.5 !text-xs max-w-[150px]" value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)}>
          <option value="all">Вся сложность</option>
          {diffs.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="ml-auto text-xs text-[#AEAEB2] dark:text-[#5A5C66]">{filtered.length} из {ideas.length}</span>
      </div>

      {loading ? (
        <ul className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="card px-5 py-4 space-y-2.5">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-1/3" />
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></>}
            title={ideas.length === 0 ? 'Здесь пока пусто' : 'Ничего не найдено'}
            hint={ideas.length === 0 ? 'Сгенерируйте первую идею — и она появится в этом списке.' : 'Попробуйте сбросить фильтры выше.'}
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((idea, idx) => (
            <li key={idea.id} className="card-interactive overflow-hidden animate-fade-in-up" style={{ animationDelay: `${Math.min(idx * 55, 440)}ms` }}>
              <button
                onClick={() => setExpanded(expanded === idea.id ? null : idea.id)}
                className="w-full text-left px-5 py-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[15px] text-[#1D1D1F] dark:text-[#ECECF1] truncate tracking-tight">{idea.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-[#6E6E73] dark:text-[#8E8EA0]">
                    <span>{new Date(idea.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {idea.params?.projectType && <><span>·</span><span>{idea.params.projectType}</span></>}
                    {idea.params?.difficulty && <><span>·</span><span>{idea.params.difficulty}</span></>}
                    {idea.params?.timeToComplete && <><span>·</span><span>{idea.params.timeToComplete}</span></>}
                    {idea.shareSlug && <><span>·</span><span className="text-brand-500">🔗 публичная</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); share(idea); }}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#AEAEB2] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-brand-500 transition-colors duration-150"
                    title="Поделиться"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(idea.id); }}
                    className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors duration-150 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] ${idea.isSaved ? 'text-brand-500' : 'text-[#AEAEB2]'}`}
                    title={idea.isSaved ? 'Убрать закладку' : 'В закладки'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={idea.isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeIdea(idea.id); }}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#AEAEB2] hover:bg-red-500/10 hover:text-red-500 transition-colors duration-150"
                    title="Удалить"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`ml-1 transition-transform duration-200 ${expanded === idea.id ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>

              {expanded === idea.id && (
                <div className="border-t border-black/[0.05] dark:border-white/[0.05] px-5 py-5 bg-black/[0.015] dark:bg-white/[0.02] animate-fade-in">
                  {(idea.params?.techStack?.length > 0 || idea.params?.customTech) && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {idea.params.techStack?.map((t) => (
                        <span key={t} className="text-xs rounded-[6px] bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-300 border border-brand-500/20 px-2.5 py-1">{t}</span>
                      ))}
                      {idea.params.customTech && idea.params.customTech.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                        <span key={t} className="text-xs rounded-[6px] bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-300 border border-brand-500/20 px-2.5 py-1">{t}</span>
                      ))}
                    </div>
                  )}
                  <IdeaMarkdown content={idea.content} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
