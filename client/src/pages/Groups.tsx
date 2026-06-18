import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Group } from '../lib/types';
import { api, useUser } from '../lib/user';
import { useToast } from '../lib/toast';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { TiltCard } from '../components/TiltCard';

export default function Groups() {
  const { user, refresh } = useUser();
  const toast = useToast();
  const [teaching, setTeaching] = useState<Group[]>([]);
  const [joined, setJoined] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  async function load() {
    setLoading(true);
    const [t, j] = await Promise.all([
      api('/api/groups/teaching').then((r) => r.json()),
      api('/api/groups/joined').then((r) => r.json()),
    ]);
    setTeaching(t.groups || []);
    setJoined(j.groups || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createGroup() {
    if (!newName.trim()) return;
    const res = await api('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) { toast.show('Не удалось создать', 'error'); return; }
    setNewName('');
    setShowCreate(false);
    toast.show('Группа создана', 'success');
    refresh();
    load();
  }

  async function join() {
    if (!joinCode.trim()) return;
    const res = await api('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({ code: joinCode.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { toast.show(data.error || 'Не удалось присоединиться', 'error'); return; }
    setJoinCode('');
    setShowJoin(false);
    toast.show(`Вы вступили в группу «${data.group.name}»`, 'success');
    load();
  }

  const isTeacher = user?.role === 'teacher';

  return (
    <div className="space-y-5 max-w-4xl">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-gradient">Группы</h1>
          <p className="text-sm text-[#6E6E73] dark:text-[#8E8EA0] mt-1">Учебные группы и задания.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)} className="btn-outline">+ Войти по коду</button>
          {isTeacher && <button onClick={() => setShowCreate(true)} className="btn-primary">+ Создать группу</button>}
        </div>
      </header>

      {loading ? (
        <ul className="grid sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="card p-5 space-y-3">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-3/4" />
            </li>
          ))}
        </ul>
      ) : (
        <>
          {isTeacher && (
            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6E6E73] dark:text-[#8E8EA0] mb-3">Я преподаю</h2>
              {teaching.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>}
                    title="Пока нет групп"
                    hint="Создайте первую группу — и поделитесь кодом со студентами."
                    action={<button onClick={() => setShowCreate(true)} className="btn-gradient">+ Создать группу</button>}
                  />
                </div>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-3">
                  {teaching.map((g, i) => (
                    <li key={g.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                      <TiltCard className="rounded-[18px]">
                        <Link to={`/groups/${g.id}`} className="card-interactive p-5 block group">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-[16px] tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">{g.name}</h3>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"><polyline points="9 18 15 12 9 6"/></svg>
                          </div>
                          <div className="text-xs text-[#6E6E73] dark:text-[#8E8EA0] mt-2 flex items-center gap-3">
                            <span className="font-mono uppercase rounded-[6px] bg-[#ECECF1] dark:bg-[#202329] px-2 py-0.5">{g.joinCode}</span>
                            <span>{g.memberCount} учн.</span>
                            <span>{g.assignmentCount} зад.</span>
                          </div>
                        </Link>
                      </TiltCard>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6E6E73] dark:text-[#8E8EA0] mb-3">Я учусь</h2>
            {joined.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/></>}
                  title="Вы пока не в группе"
                  hint="Получите код у преподавателя и присоединитесь к учебной группе."
                  action={<button onClick={() => setShowJoin(true)} className="btn-outline">+ Войти по коду</button>}
                />
              </div>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {joined.map((g, i) => (
                  <li key={g.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                    <TiltCard className="rounded-[18px]">
                      <Link to={`/groups/${g.id}`} className="card-interactive p-5 block group">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-[16px] tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">{g.name}</h3>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                        <div className="text-xs text-[#6E6E73] dark:text-[#8E8EA0] mt-2">
                          Преподаватель: {g.teacherName}
                        </div>
                      </Link>
                    </TiltCard>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {showCreate && (
        <Modal title="Новая группа" subtitle="Создайте пространство для заданий" size="max-w-sm" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <input
              className="input"
              placeholder="Название — например, БВТ-21-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') createGroup(); }}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-outline">Отмена</button>
              <button onClick={createGroup} className="btn-primary">Создать</button>
            </div>
          </div>
        </Modal>
      )}

      {showJoin && (
        <Modal title="Войти по коду" subtitle="Введите код группы от преподавателя" size="max-w-sm" onClose={() => setShowJoin(false)}>
          <div className="space-y-4">
            <input
              className="input font-mono uppercase tracking-[0.4em] text-center text-lg"
              placeholder="ABCDEF"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') join(); }}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowJoin(false)} className="btn-outline">Отмена</button>
              <button onClick={join} className="btn-primary">Войти</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
