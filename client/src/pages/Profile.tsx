import { useEffect, useState } from 'react';
import { Profile as ProfileT } from '../lib/types';
import { api, initials, nameGradient, useUser } from '../lib/user';
import { useToast } from '../lib/toast';
import { useCountUp } from '../lib/useCountUp';
import { TiltCard } from '../components/TiltCard';

export default function Profile() {
  const [profile, setProfile] = useState<ProfileT | null>(null);
  const { user, updateName } = useUser();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/api/profile').then((r) => r.json()).then(setProfile);
  }, [user?.username]);

  async function saveName() {
    const name = draft.trim();
    if (!name) { toast.show('Ник не может быть пустым', 'error'); return; }
    setSaving(true);
    try {
      await updateName(name);
      setProfile((p) => (p ? { ...p, username: name } : p));
      setEditing(false);
      toast.show('Ник обновлён', 'success');
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="card p-6 flex items-center gap-5">
          <div className="skeleton w-20 h-20 rounded-[18px]" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="card p-5 space-y-3"><div className="skeleton h-3 w-2/3" /><div className="skeleton h-7 w-1/2" /></div>)}
        </div>
      </div>
    );
  }

  const joined = new Date(profile.joinedAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
  const streakLabel = profile.streak === 1 ? 'день' : profile.streak < 5 ? 'дня' : 'дней';

  return (
    <div className="space-y-4 max-w-2xl">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight text-gradient">Профиль</h1>
      </header>

      <div className="card p-6 flex items-center gap-5 relative overflow-hidden animate-fade-in-up">
        <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="w-20 h-20 rounded-[18px] grid place-items-center text-white text-[26px] font-bold shadow-glow relative shrink-0"
          style={{ backgroundImage: nameGradient(profile.username) }}>
          {initials(profile.username)}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input className="input max-w-[220px]" value={draft} autoFocus maxLength={32}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false); }} />
              <button onClick={saveName} disabled={saving} className="btn-primary !px-3 !py-2">{saving ? '…' : 'Сохранить'}</button>
              <button onClick={() => setEditing(false)} className="btn-ghost !px-3 !py-2">Отмена</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">{profile.username}</h2>
              <button onClick={() => { setDraft(profile.username); setEditing(true); }}
                className="w-7 h-7 grid place-items-center rounded-[8px] text-[#AEAEB2] hover:text-brand-500 hover:bg-brand-500/10 transition-colors" title="Изменить ник">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
              <span className={`text-[10px] uppercase tracking-wider rounded-[6px] px-2 py-0.5 font-semibold ${profile.role === 'teacher' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-brand-500/10 text-brand-500 dark:text-brand-300'}`}>
                {profile.role === 'teacher' ? 'Преподаватель' : 'Студент'}
              </span>
            </div>
          )}
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0] mt-0.5">Зарегистрирован {joined}</p>
          {profile.login && <p className="text-[12px] text-[#AEAEB2] dark:text-[#5A5C66] mt-1.5 font-mono">@{profile.login}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Идей" value={profile.totalIdeas} delay={60} />
        <Stat label="Закладок" value={profile.savedIdeas} delay={120} />
        <Stat label="Серия" value={profile.streak} suffix={streakLabel} delay={180} />
        <Stat label="Тегов" value={profile.favoriteTags.length} delay={240} />
      </div>

      <div className="card p-6">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6E6E73] dark:text-[#8E8EA0] mb-4">Любимые технологии</h3>
        {profile.favoriteTags.length === 0 ? (
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0]">Сгенерируйте несколько идей — здесь появится ваш любимый стек.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.favoriteTags.map((t) => (
              <span key={t.tag} className="rounded-[8px] bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-300 border border-brand-500/20 px-3 py-1.5 text-xs font-medium">
                {t.tag} <span className="opacity-50 ml-1">{t.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, delay = 0 }: { label: string; value: number; suffix?: string; delay?: number }) {
  const display = useCountUp(value, 1100, delay + 120);
  return (
    <TiltCard className="card-interactive p-5 rounded-[18px] animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6E6E73] dark:text-[#8E8EA0]">{label}</div>
      <div className="text-[32px] font-semibold mt-1 tracking-tight text-[#1D1D1F] dark:text-[#ECECF1] tabular-nums">
        {display}
        {suffix && <span className="text-sm font-medium text-[#6E6E73] dark:text-[#8E8EA0] ml-1.5">{suffix}</span>}
      </div>
    </TiltCard>
  );
}
