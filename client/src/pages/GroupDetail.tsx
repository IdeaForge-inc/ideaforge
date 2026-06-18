import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Assignment, GenerateParams, Group, GroupMember, Idea, SubmissionStatus } from '../lib/types';
import { api, initials, nameGradient, useUser } from '../lib/user';
import { useToast } from '../lib/toast';
import { IdeaMarkdown } from '../components/IdeaMarkdown';
import { Modal } from '../components/Modal';
import { DeadlineBadge } from '../components/DeadlineBadge';
import { dateInputToTimestamp } from '../lib/deadline';

interface GroupBundle {
  group: Group;
  members: GroupMember[];
  ideas: Idea[];
  assignments: Assignment[];
}

type Tab = 'feed' | 'members' | 'assignments';

export default function GroupDetail() {
  const { id } = useParams();
  const groupId = Number(id);
  const navigate = useNavigate();
  const { user } = useUser();
  const toast = useToast();
  const [data, setData] = useState<GroupBundle | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  async function load() {
    const res = await api(`/api/groups/${groupId}`);
    if (!res.ok) {
      toast.show('Группа не найдена', 'error');
      navigate('/groups');
      return;
    }
    setData(await res.json());
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [groupId]);

  if (!data) {
    return (
      <div className="space-y-5 max-w-5xl">
        <div className="space-y-3">
          <div className="skeleton h-6 w-1/3" />
          <div className="skeleton h-4 w-1/4" />
        </div>
        <div className="skeleton h-12 w-full rounded-[18px]" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="card px-5 py-4"><div className="skeleton h-4 w-1/2" /></div>)}
        </div>
      </div>
    );
  }

  const isTeacher = user?.userId === data.group.teacherId;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(data!.group.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.show('Код скопирован', 'success');
    } catch {
      toast.show(data!.group.joinCode, 'info');
    }
  }

  async function leave() {
    if (!confirm('Покинуть группу?')) return;
    await api(`/api/groups/${groupId}/leave`, { method: 'DELETE' });
    navigate('/groups');
  }

  async function deleteGroup() {
    if (!confirm('Удалить группу? Все задания будут удалены.')) return;
    await api(`/api/groups/${groupId}`, { method: 'DELETE' });
    toast.show('Группа удалена', 'success');
    navigate('/groups');
  }

  async function deleteAssignment(aid: number) {
    if (!confirm('Удалить задание?')) return;
    await api(`/api/assignments/${aid}`, { method: 'DELETE' });
    load();
  }

  async function removeMember(memberId: string, name: string) {
    if (!confirm(`Исключить ${name} из группы?`)) return;
    const res = await api(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
    if (!res.ok) { toast.show('Не удалось исключить', 'error'); return; }
    toast.show(`${name} исключён(а) из группы`, 'success');
    load();
  }

  async function saveGroupName() {
    const name = nameDraft.trim();
    if (!name) { toast.show('Введите название', 'error'); return; }
    const res = await api(`/api/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify({ name }) });
    if (!res.ok) { toast.show('Не удалось переименовать', 'error'); return; }
    setData((d) => (d ? { ...d, group: { ...d.group, name } } : d));
    setEditingName(false);
    toast.show('Название обновлено', 'success');
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/groups" className="text-xs text-[#6E6E73] dark:text-[#8E8EA0] hover:text-brand-500">← Все группы</Link>
          {editingName ? (
            <div className="flex items-center gap-2 mt-1">
              <input className="input max-w-[280px] !text-lg !font-bold" value={nameDraft} autoFocus maxLength={80}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveGroupName(); if (e.key === 'Escape') setEditingName(false); }} />
              <button onClick={saveGroupName} className="btn-primary !px-3 !py-2 text-xs">Сохранить</button>
              <button onClick={() => setEditingName(false)} className="btn-ghost !px-3 !py-2 text-xs">Отмена</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-[26px] font-bold tracking-tight text-gradient">{data.group.name}</h1>
              {isTeacher && (
                <button onClick={() => { setNameDraft(data.group.name); setEditingName(true); }}
                  className="w-7 h-7 grid place-items-center rounded-[8px] text-[#AEAEB2] hover:text-brand-500 hover:bg-brand-500/10 transition-colors" title="Переименовать группу">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button
              onClick={copyCode}
              title="Скопировать код"
              className="group/code gradient-border relative inline-flex items-center gap-3 rounded-[14px] bg-gradient-to-br from-brand-500/[0.08] to-brand-400/[0.03] pl-4 pr-3 py-2 hover:shadow-[0_4px_18px_rgba(77,107,254,0.18)] active:scale-[0.98] transition-all duration-200"
            >
              <div className="text-left">
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-500/70 dark:text-brand-300/70">Код группы</div>
                <div className="font-mono text-[19px] font-bold tracking-[0.32em] text-brand-600 dark:text-brand-200 leading-tight">{data.group.joinCode}</div>
              </div>
              <span className="grid place-items-center w-8 h-8 rounded-[10px] bg-brand-500/10 text-brand-500 dark:text-brand-300 group-hover/code:bg-brand-500/20 transition-colors">
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                )}
              </span>
            </button>
            <span className="text-xs text-[#6E6E73] dark:text-[#8E8EA0]">{data.members.length} участн. · {data.ideas.length} идей</span>
          </div>
        </div>
        <div className="flex gap-2">
          {isTeacher ? (
            <button onClick={deleteGroup} className="btn-outline text-red-500">Удалить группу</button>
          ) : (
            <button onClick={leave} className="btn-outline">Покинуть</button>
          )}
        </div>
      </div>

      {isTeacher && <GroupSummary data={data} />}

      <div className="card px-3 py-2 flex gap-1">
        {(['feed', 'assignments', 'members'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-[8px] px-3 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-brand-500/10 text-brand-500 dark:text-brand-300' : 'text-[#6E6E73] dark:text-[#8E8EA0] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
          >
            {t === 'feed' ? 'Лента идей' : t === 'assignments' ? `Задания (${data.assignments.length})` : `Участники (${data.members.length})`}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <section>
          {data.ideas.length === 0 ? (
            <div className="card p-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8EA0]">В этой группе пока нет идей.</div>
          ) : (
            <ul className="space-y-2">
              {data.ideas.map((idea, i) => (
                <li
                  key={idea.id}
                  className="card-interactive overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}
                >
                  <button
                    onClick={() => setExpanded(expanded === idea.id ? null : idea.id)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4"
                  >
                    {idea.author && (
                      <div className="w-9 h-9 rounded-[11px] grid place-items-center text-white text-xs font-bold shrink-0" style={{ backgroundImage: nameGradient(idea.author.username) }}>
                        {initials(idea.author.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[15px] text-[#1D1D1F] dark:text-[#ECECF1] truncate tracking-tight">{idea.title}</h3>
                        {idea.assignmentId && <FeedStatusBadge status={idea.submissionStatus} grade={idea.grade} />}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-[#6E6E73] dark:text-[#8E8EA0]">
                        <span>{idea.author?.username}</span>
                        <span>·</span>
                        <span>{new Date(idea.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        {idea.assignmentId && <><span>·</span><span className="text-amber-500">📝 задание</span></>}
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`transition-transform duration-300 ${expanded === idea.id ? 'rotate-180 text-brand-500' : ''}`}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {expanded === idea.id && (
                    <div className="border-t border-black/[0.05] dark:border-white/[0.05] px-5 py-5 bg-black/[0.015] dark:bg-white/[0.02] animate-fade-in">
                      {idea.repoUrl && (
                        <a href={idea.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-brand-500 hover:underline mb-4 break-all">
                          🔗 {idea.repoUrl}
                        </a>
                      )}
                      <IdeaMarkdown content={idea.content} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'members' && (
        <section>
          <ul className="grid sm:grid-cols-2 gap-2">
            {data.members.map((m) => (
              <li key={m.userId} className="group/member card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] grid place-items-center text-white text-sm font-bold shrink-0" style={{ backgroundImage: nameGradient(m.username) }}>
                  {initials(m.username)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#ECECF1] truncate">{m.username}</div>
                  <div className="text-xs text-[#6E6E73] dark:text-[#8E8EA0]">{m.ideaCount} идей</div>
                </div>
                {isTeacher && m.userId !== data.group.teacherId && (
                  <button
                    onClick={() => removeMember(m.userId, m.username)}
                    title="Исключить из группы"
                    className="w-8 h-8 grid place-items-center rounded-[10px] text-[#AEAEB2] hover:bg-red-500/10 hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover/member:opacity-100"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="17" y1="8" x2="22" y2="13" /><line x1="22" y1="8" x2="17" y2="13" /></svg>
                  </button>
                )}
              </li>
            ))}
            {data.members.length === 0 && (
              <li className="card p-8 text-center text-sm text-[#6E6E73] dark:text-[#8E8EA0] col-span-2">Никто ещё не вступил. Поделитесь кодом <span className="font-mono">{data.group.joinCode}</span>.</li>
            )}
          </ul>
        </section>
      )}

      {tab === 'assignments' && (
        <section className="space-y-3">
          {isTeacher && (
            <button onClick={() => setShowAssignmentForm(true)} className="btn-primary">+ Новый шаблон задания</button>
          )}
          {data.assignments.length === 0 ? (
            <div className="card p-10 text-center text-sm text-[#6E6E73] dark:text-[#8E8EA0]">
              Заданий нет.{isTeacher && ' Создайте шаблон с готовыми параметрами — студенты сгенерируют идею прямо под него.'}
            </div>
          ) : (
            <ul className="space-y-2">
              {data.assignments.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  isTeacher={isTeacher}
                  onDelete={() => deleteAssignment(a.id)}
                  groupId={groupId}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {showAssignmentForm && (
        <AssignmentForm
          groupId={groupId}
          onClose={() => setShowAssignmentForm(false)}
          onCreated={() => { setShowAssignmentForm(false); load(); }}
        />
      )}
    </div>
  );
}

function GroupSummary({ data }: { data: GroupBundle }) {
  const totalSub = data.assignments.reduce((s, a) => s + (a.submissionCount ?? 0), 0);
  const totalDone = data.assignments.reduce((s, a) => s + (a.doneCount ?? 0), 0);
  const totalGraded = data.assignments.reduce((s, a) => s + (a.gradedCount ?? 0), 0);
  const grades = data.ideas.map((i) => i.grade).filter((g): g is number => g != null);
  const avg = grades.length ? (grades.reduce((s, g) => s + g, 0) / grades.length) : null;
  const overdue = data.assignments.filter((a) => a.dueAt && a.dueAt < Date.now()).length;
  const donePct = totalSub ? Math.round((totalDone / totalSub) * 100) : 0;

  const metrics = [
    { label: 'Участников', value: String(data.members.length) },
    { label: 'Заданий', value: String(data.assignments.length) + (overdue ? ` · ${overdue} просроч.` : '') },
    { label: 'Сдач', value: String(totalSub), sub: totalSub ? `${totalDone} готово · ${totalGraded} оценено` : '—' },
    { label: 'Средний балл', value: avg != null ? avg.toFixed(1) : '—', accent: true },
  ];

  return (
    <div className="card p-4 sm:p-5 animate-fade-in-up">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#6E6E73] dark:text-[#8E8EA0]">{m.label}</div>
            <div className={`text-[24px] font-bold tracking-tight tabular-nums mt-0.5 ${m.accent ? 'text-brand-500 dark:text-brand-300' : 'text-[#1D1D1F] dark:text-[#ECECF1]'}`}>{m.value}</div>
            {m.sub && <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8EA0] mt-0.5">{m.sub}</div>}
          </div>
        ))}
      </div>
      {totalSub > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-[#6E6E73] dark:text-[#8E8EA0] mb-1.5">
            <span>Прогресс группы</span>
            <span className="font-semibold text-[#1D1D1F] dark:text-[#ECECF1]">{donePct}% готово</span>
          </div>
          <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.07] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-700 ease-out" style={{ width: `${donePct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment, isTeacher, onDelete, groupId }: { assignment: Assignment; isTeacher: boolean; onDelete: () => void; groupId: number }) {
  const params = new URLSearchParams({ assignmentId: String(assignment.id), groupId: String(groupId) });
  const targetUrl = `/?${params.toString()}`;
  const [mySubmission, setMySubmission] = useState<Idea | null>(null);
  const [showTeacherView, setShowTeacherView] = useState(false);

  useEffect(() => {
    if (isTeacher) return;
    api(`/api/assignments/${assignment.id}/my-submission`)
      .then((r) => r.json())
      .then((d) => setMySubmission(d.idea || null));
  }, [assignment.id, isTeacher]);

  const myStatus = mySubmission?.submissionStatus;

  return (
    <li className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[16px] tracking-tight text-[#1D1D1F] dark:text-[#ECECF1]">{assignment.title}</h3>
            <DeadlineBadge dueAt={assignment.dueAt} withDate />
          </div>
          {assignment.description && (
            <p className="text-sm text-[#3A3A3C] dark:text-[#C8C8D4] mt-2 whitespace-pre-wrap">{assignment.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {assignment.params.projectType && <Pill>{assignment.params.projectType}</Pill>}
            {assignment.params.difficulty && <Pill>{assignment.params.difficulty}</Pill>}
            {assignment.params.timeToComplete && <Pill>{assignment.params.timeToComplete}</Pill>}
            {assignment.params.domain && <Pill>{assignment.params.domain}</Pill>}
            {assignment.params.techStack?.map((t) => <Pill key={t}>{t}</Pill>)}
          </div>
          <div className="text-xs text-[#6E6E73] dark:text-[#8E8EA0] mt-3 flex gap-3 flex-wrap">
            <span>{assignment.submissionCount ?? 0} сдач</span>
            {(assignment.inProgressCount ?? 0) > 0 && <span>· {assignment.inProgressCount} в работе</span>}
            {(assignment.doneCount ?? 0) > 0 && <span className="text-emerald-600 dark:text-emerald-400">· {assignment.doneCount} готово</span>}
            {(assignment.gradedCount ?? 0) > 0 && <span className="text-amber-600 dark:text-amber-400">· {assignment.gradedCount} оценено</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {isTeacher ? (
            <>
              <button onClick={() => setShowTeacherView(true)} className="btn-primary text-xs !py-2 !px-3">Сдачи</button>
              <button onClick={onDelete} className="btn-outline text-xs !py-2 !px-3 text-red-500">Удалить</button>
            </>
          ) : mySubmission ? (
            <>
              <Link to={targetUrl} className="btn-primary text-xs !py-2 !px-3">Моя сдача</Link>
              <StatusBadge status={myStatus!} grade={mySubmission.grade} />
            </>
          ) : (
            <Link to={targetUrl} className="btn-primary text-xs !py-2 !px-3">Выполнить</Link>
          )}
        </div>
      </div>

      {showTeacherView && (
        <TeacherSubmissionsModal
          assignmentId={assignment.id}
          title={assignment.title}
          onClose={() => setShowTeacherView(false)}
        />
      )}
    </li>
  );
}

function FeedStatusBadge({ status, grade }: { status: SubmissionStatus; grade: number | null }) {
  if (grade !== null) {
    return <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold">★ {grade}/5</span>;
  }
  const map: Record<SubmissionStatus, { label: string; cls: string }> = {
    not_started: { label: 'Не начато', cls: 'bg-black/[0.05] dark:bg-white/[0.08] text-[#6E6E73] dark:text-[#8E8EA0]' },
    in_progress: { label: 'В работе', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    done: { label: 'Готово', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  };
  const v = map[status];
  return <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.cls}`}>{v.label}</span>;
}

function StatusBadge({ status, grade }: { status: SubmissionStatus; grade: number | null }) {
  if (grade !== null) {
    return <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold text-center">★ {grade}/5</span>;
  }
  const map: Record<SubmissionStatus, { label: string; cls: string }> = {
    not_started: { label: 'Не начато', cls: 'text-[#6E6E73] dark:text-[#8E8EA0]' },
    in_progress: { label: 'В работе', cls: 'text-blue-500' },
    done: { label: '✅ Готово', cls: 'text-emerald-600 dark:text-emerald-400' },
  };
  const v = map[status];
  return <span className={`text-[11px] font-medium text-center ${v.cls}`}>{v.label}</span>;
}

function TeacherSubmissionsModal({ assignmentId, title, onClose }: { assignmentId: number; title: string; onClose: () => void }) {
  const [submissions, setSubmissions] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<Idea | null>(null);

  async function load() {
    setLoading(true);
    const res = await api(`/api/assignments/${assignmentId}`);
    const data = await res.json();
    setSubmissions(data.submissions || []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [assignmentId]);

  return (
    <Modal onClose={onClose} size="max-w-2xl" title={`Сдачи: ${title}`} subtitle={`${submissions.length} ${submissions.length === 1 ? 'сдача' : 'сдач'}`}>
      <div className="space-y-4">
        {loading ? (
          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="card p-4 flex items-center gap-3">
                <div className="skeleton w-9 h-9 rounded-[10px]" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-2.5 w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : submissions.length === 0 ? (
          <div className="text-center text-sm text-[#6E6E73] dark:text-[#8E8EA0] py-10">Сдач пока нет.</div>
        ) : (
          <ul className="space-y-2">
            {submissions.map((s, i) => (
              <li key={s.id} className="card p-4 animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}>
                <div className="flex items-start gap-3">
                  {s.author && (
                    <div className="w-9 h-9 rounded-[11px] grid place-items-center text-white text-xs font-bold shrink-0" style={{ backgroundImage: nameGradient(s.author.username) }}>
                      {initials(s.author.username)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#1D1D1F] dark:text-[#ECECF1]">{s.author?.username}</span>
                      <StatusBadge status={s.submissionStatus} grade={s.grade} />
                    </div>
                    <div className="text-xs text-[#6E6E73] dark:text-[#8E8EA0] mt-0.5">{s.title}</div>
                    {s.repoUrl && (
                      <a href={s.repoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline mt-1 inline-block break-all">
                        🔗 {s.repoUrl}
                      </a>
                    )}
                    {s.studentNote && (
                      <p className="text-xs text-[#3A3A3C] dark:text-[#C8C8D4] mt-1.5 whitespace-pre-wrap">{s.studentNote}</p>
                    )}
                    {s.teacherFeedback && (
                      <div className="mt-2 rounded-[8px] bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 whitespace-pre-wrap">
                        Фидбек: {s.teacherFeedback}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setGrading(s)} className="btn-outline text-xs !py-1.5 !px-2.5 shrink-0">
                    {s.grade !== null ? 'Изменить' : 'Оценить'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

      </div>

      {grading && (
        <GradingModal
          idea={grading}
          onClose={() => setGrading(null)}
          onGraded={() => { setGrading(null); load(); }}
        />
      )}
    </Modal>
  );
}

function GradingModal({ idea, onClose, onGraded }: { idea: Idea; onClose: () => void; onGraded: () => void }) {
  const toast = useToast();
  const [grade, setGrade] = useState<number | null>(idea.grade);
  const [feedback, setFeedback] = useState(idea.teacherFeedback);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api(`/api/history/${idea.id}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({ grade, feedback }),
    });
    setSaving(false);
    if (!res.ok) { toast.show('Не удалось сохранить оценку', 'error'); return; }
    toast.show('Оценка сохранена', 'success');
    onGraded();
  }

  return (
    <Modal onClose={onClose} size="max-w-md" title="Оценить сдачу" subtitle={`${idea.author?.username} · ${idea.title}`}>
      <div className="space-y-5">
        <div>
          <label className="field">Оценка</label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setGrade(n)}
                className={`text-3xl transition-all duration-150 hover:scale-110 active:scale-95 ${(grade || 0) >= n ? 'text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]' : 'text-[#E5E5EA] dark:text-[#3A3A3C] hover:text-amber-300'}`}
              >
                ★
              </button>
            ))}
            {grade !== null && (
              <button onClick={() => setGrade(null)} className="text-xs text-[#6E6E73] dark:text-[#8E8EA0] hover:text-red-500 ml-2 self-center">очистить</button>
            )}
          </div>
        </div>

        <div>
          <label className="field">Фидбек</label>
          <textarea
            className="input resize-none"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Что хорошо, что улучшить..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-outline">Отмена</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Сохранение...' : 'Сохранить'}</button>
        </div>
      </div>
    </Modal>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="text-xs rounded-[6px] bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-300 border border-brand-500/20 px-2.5 py-1">{children}</span>;
}

const PROJECT_TYPES = ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'Desktop', 'CLI', 'Bot', 'API'];
const DIFFICULTIES = ['Новичок', 'Средний', 'Продвинутый', 'Эксперт'];
const TEAM_SIZES = ['1', '2-3', '4-5', '6-10'];
const TIMES = ['1 день', '3 дня', '1 неделя', '2 недели', '1 месяц', '3 месяца'];
const DOMAINS = ['E-commerce', 'Соцсеть', 'Образование', 'Инструменты', 'Игры', 'Финансы', 'Здоровье', 'Недвижимость'];

/** Поле «чипы + свой вариант»: выбор из списка или произвольный ввод. */
function ChipField({ label, options, value, onChange, placeholder, formatOption }: {
  label: React.ReactNode; options: string[]; value: string; onChange: (v: string) => void; placeholder: string; formatOption?: (o: string) => string;
}) {
  const isCustom = value !== '' && !options.includes(value);
  return (
    <div>
      <label className="field">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)} className={`chip ${value === o ? 'chip-active' : ''}`}>
            {formatOption ? formatOption(o) : o}
          </button>
        ))}
      </div>
      <input className="input" placeholder={placeholder} value={isCustom ? value : ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AssignmentForm({ groupId, onClose, onCreated }: { groupId: number; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [params, setParams] = useState<Partial<GenerateParams>>({
    projectType: 'Fullstack', difficulty: 'Средний', teamSize: '1', timeToComplete: '1 неделя', domain: 'Инструменты',
    techStack: [], language: 'Русский',
  });
  const [techInput, setTechInput] = useState('');
  const [dueDate, setDueDate] = useState('');

  function update<K extends keyof GenerateParams>(k: K, v: GenerateParams[K]) {
    setParams((p) => ({ ...p, [k]: v }));
  }

  async function submit() {
    if (!title.trim()) { toast.show('Введите заголовок', 'error'); return; }
    const finalParams = {
      ...params,
      techStack: [...(params.techStack || []), ...techInput.split(',').map((s) => s.trim()).filter(Boolean)],
    };
    const res = await api(`/api/groups/${groupId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ title: title.trim(), description: description.trim(), params: finalParams, dueAt: dateInputToTimestamp(dueDate) }),
    });
    if (!res.ok) { toast.show('Не удалось создать задание', 'error'); return; }
    toast.show('Задание создано', 'success');
    onCreated();
  }

  return (
    <Modal onClose={onClose} size="max-w-lg" title="Новое задание" subtitle="Параметры, под которые студенты сгенерируют идею">
      <div className="space-y-5">
        <div>
          <label className="field">Заголовок</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Лабораторная №3 — REST API" />
        </div>
        <div>
          <label className="field">Описание</label>
          <textarea className="input resize-none" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Что ожидается, критерии оценки..." />
        </div>

        <ChipField label="Тип проекта" options={PROJECT_TYPES} value={params.projectType || ''} onChange={(v) => update('projectType', v)} placeholder="Свой вариант — например, Chrome Extension" />
        <ChipField label="Сложность" options={DIFFICULTIES} value={params.difficulty || ''} onChange={(v) => update('difficulty', v)} placeholder="Свой уровень — например, Junior+" />

        <div className="grid grid-cols-2 gap-4">
          <ChipField label="Команда" options={TEAM_SIZES} value={params.teamSize || ''} onChange={(v) => update('teamSize', v)} placeholder="Своё" formatOption={(t) => t === '1' ? 'Соло' : `${t} чел.`} />
          <ChipField label={<>Оценочная трудоёмкость <span className="normal-case font-normal text-[#AEAEB2]">(для ИИ)</span></>} options={TIMES} value={params.timeToComplete || ''} onChange={(v) => update('timeToComplete', v)} placeholder="Своё — например, 10 дней" />
        </div>

        <ChipField label="Область" options={DOMAINS} value={params.domain || ''} onChange={(v) => update('domain', v)} placeholder="Своя область — например, Кибербезопасность" />

        <div>
          <label className="field">Стек <span className="normal-case font-normal text-[#AEAEB2]">(через запятую)</span></label>
          <input className="input" value={techInput} onChange={(e) => setTechInput(e.target.value)} placeholder="React, Node.js, PostgreSQL" />
        </div>

        <div>
          <label className="field">Дедлайн сдачи <span className="normal-case font-normal text-[#AEAEB2]">(календарная дата, необязательно)</span></label>
          <input type="date" className="input" value={dueDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-outline">Отмена</button>
          <button onClick={submit} className="btn-primary">Создать</button>
        </div>
      </div>
    </Modal>
  );
}
