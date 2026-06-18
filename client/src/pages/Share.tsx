import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Idea } from '../lib/types';
import { initials, nameGradient } from '../lib/user';
import { IdeaMarkdown } from '../components/IdeaMarkdown';

export default function Share() {
  const { slug } = useParams();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${slug}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d) => setIdea(d.idea))
      .catch(() => setError('Идея не найдена или ссылка устарела.'));
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-black/[0.06] dark:border-white/[0.07] bg-white/80 dark:bg-[#1B1D23]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="font-semibold text-[14px] tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">IdeaForge</span>
          </Link>
          <Link to="/" className="text-xs text-[#6E6E73] dark:text-[#8E8EA0] hover:text-brand-500">Создать свою идею →</Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {error && (
          <div className="card p-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8EA0]">{error}</div>
        )}
        {!error && !idea && (
          <div className="card p-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8EA0]">Загрузка...</div>
        )}
        {idea && (
          <article className="card p-8 space-y-6 animate-fade-in-up">
            {idea.author && (
              <div className="flex items-center gap-3 pb-5 border-b border-black/[0.06] dark:border-white/[0.07]">
                <div className="w-10 h-10 rounded-[12px] grid place-items-center text-white text-sm font-bold shrink-0" style={{ backgroundImage: nameGradient(idea.author.username) }}>
                  {initials(idea.author.username)}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#ECECF1]">{idea.author.username}</div>
                  <div className="text-xs text-[#6E6E73] dark:text-[#8E8EA0]">
                    {new Date(idea.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            )}

            {(idea.params?.techStack?.length > 0 || idea.params?.customTech) && (
              <div className="flex flex-wrap gap-1.5">
                {idea.params.techStack?.map((t) => (
                  <span key={t} className="text-xs rounded-[6px] bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-300 border border-brand-500/20 px-2.5 py-1">{t}</span>
                ))}
                {idea.params.customTech && idea.params.customTech.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                  <span key={t} className="text-xs rounded-[6px] bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-300 border border-brand-500/20 px-2.5 py-1">{t}</span>
                ))}
              </div>
            )}

            <IdeaMarkdown content={idea.content} />
          </article>
        )}
      </main>
    </div>
  );
}
