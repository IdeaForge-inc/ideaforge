import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  getUser,
  getUserByToken,
  registerAccount,
  loginAccount,
  logoutAccount,
  updateDisplayName,
  publicUser,
  insertIdea,
  listIdeas,
  deleteIdea,
  toggleBookmark,
  updateSubmission,
  gradeSubmission,
  getUserSubmission,
  ensureShareSlug,
  getIdeaBySlug,
  getProfile,
  createGroup,
  joinGroup,
  leaveGroup,
  removeMember,
  renameGroup,
  deleteGroup,
  getGroup,
  listTeacherGroups,
  listStudentGroups,
  listGroupMembers,
  listGroupIdeas,
  createAssignment,
  getAssignment,
  listAssignments,
  listAssignmentSubmissions,
  deleteAssignment,
} from './db.js';
import { streamIdea, extractTitle } from './llm.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- auth ---

function tokenFrom(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

/** Резолвит токен -> req.user / req.userId. Не блокирует — просто проставляет. */
function attachUser(req, _res, next) {
  const u = getUserByToken(tokenFrom(req));
  if (u) { req.user = u; req.userId = u.id; }
  next();
}

/** Требует валидную сессию. */
function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'unauthorized' });
  next();
}

app.use(attachUser);

const AUTH_ERRORS = {
  bad_login: 'Логин: 3–24 символа, латиница/цифры/._-',
  weak_password: 'Пароль должен быть не короче 6 символов',
  login_taken: 'Этот логин уже занят',
  invalid_credentials: 'Неверный логин или пароль',
};

app.post('/api/auth/register', (req, res) => {
  const { login, password, displayName, role } = req.body || {};
  const result = registerAccount({ login, password, displayName, role });
  if (result.error) return res.status(400).json({ error: AUTH_ERRORS[result.error] || result.error });
  res.json({ token: result.token, user: publicUser(result.user) });
});

app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body || {};
  const result = loginAccount({ login, password });
  if (result.error) return res.status(401).json({ error: AUTH_ERRORS[result.error] || result.error });
  res.json({ token: result.token, user: publicUser(result.user) });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.userId ? publicUser(req.user) : null });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  logoutAccount(req.userId);
  res.json({ ok: true });
});

// Смена отображаемого ника
app.patch('/api/users/me', requireAuth, (req, res) => {
  const result = updateDisplayName(req.userId, req.body?.displayName);
  if (result.error) return res.status(400).json({ error: 'Введите ник' });
  res.json({ user: publicUser(result.user) });
});

// --- generation ---

app.post('/api/generate', requireAuth, async (req, res) => {
  const { assignmentId, ...params } = req.body || {};
  const userId = req.userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  await streamIdea(params, {
    onToken: (chunk) => send('token', { chunk }),
    onDone: (full) => {
      const title = extractTitle(full);
      const idea = insertIdea({ userId, title, content: full, params, assignmentId: assignmentId || null });
      send('done', { idea });
      res.end();
    },
    onError: (err) => {
      send('error', { message: err.message || 'Generation failed' });
      res.end();
    },
  });
});

// --- history ---

app.get('/api/history', requireAuth, (req, res) => {
  res.json({ ideas: listIdeas(req.userId) });
});

app.post('/api/history/save', requireAuth, (req, res) => {
  const { title, content, params } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content required' });
  const idea = insertIdea({
    userId: req.userId,
    title: title || extractTitle(content),
    content,
    params: params || {},
  });
  res.json({ idea });
});

app.patch('/api/history/:id/bookmark', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  const idea = toggleBookmark(id);
  if (!idea) return res.status(404).json({ error: 'not found' });
  res.json({ idea });
});

app.delete('/api/history/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  const ok = deleteIdea(id, req.userId);
  if (!ok) return res.status(404).json({ error: 'not found or forbidden' });
  res.json({ ok: true });
});

// --- submission status / grading ---

app.patch('/api/history/:id/submission', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status, repoUrl, studentNote } = req.body || {};
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid request' });
  const result = updateSubmission({ id, userId: req.userId, status, repoUrl, studentNote });
  if (result.error === 'not_found') return res.status(404).json({ error: 'not found or forbidden' });
  if (result.error === 'repo_required') {
    return res.status(422).json({ error: 'repo_required', message: 'Чтобы отметить «Готово», добавьте корректную ссылку на репозиторий (http/https).' });
  }
  res.json({ idea: result.idea });
});

app.patch('/api/history/:id/grade', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { grade, feedback } = req.body || {};
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid request' });
  const idea = gradeSubmission({ id, teacherId: req.userId, grade, feedback });
  if (!idea) return res.status(403).json({ error: 'forbidden' });
  res.json({ idea });
});

app.get('/api/assignments/:id/my-submission', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  const idea = getUserSubmission(id, req.userId);
  res.json({ idea });
});

// --- share ---

app.post('/api/history/:id/share', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid request' });
  const slug = ensureShareSlug(id, req.userId);
  if (!slug) return res.status(404).json({ error: 'not found or forbidden' });
  res.json({ slug });
});

app.get('/api/share/:slug', (req, res) => {
  const idea = getIdeaBySlug(req.params.slug);
  if (!idea) return res.status(404).json({ error: 'not found' });
  res.json({ idea });
});

// --- profile ---

app.get('/api/profile', requireAuth, (req, res) => {
  const p = getProfile(req.userId);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

// --- groups ---

app.get('/api/groups/teaching', requireAuth, (req, res) => {
  res.json({ groups: listTeacherGroups(req.userId) });
});

app.get('/api/groups/joined', requireAuth, (req, res) => {
  res.json({ groups: listStudentGroups(req.userId) });
});

app.post('/api/groups', requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const group = createGroup({ teacherId: req.userId, name });
  if (!group) return res.status(500).json({ error: 'could not create group' });
  res.json({ group });
});

app.post('/api/groups/join', requireAuth, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  const result = joinGroup({ userId: req.userId, code: code.trim().toUpperCase() });
  if (!result) return res.status(404).json({ error: 'Группа не найдена' });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ group: result });
});

app.delete('/api/groups/:groupId/leave', requireAuth, (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isFinite(groupId)) return res.status(400).json({ error: 'invalid request' });
  const ok = leaveGroup({ userId: req.userId, groupId });
  res.json({ ok });
});

// Переименование группы
app.patch('/api/groups/:groupId', requireAuth, (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isFinite(groupId)) return res.status(400).json({ error: 'invalid request' });
  const result = renameGroup({ groupId, teacherId: req.userId, name: req.body?.name });
  if (result.error === 'forbidden') return res.status(403).json({ error: 'forbidden' });
  if (result.error === 'empty') return res.status(400).json({ error: 'Введите название' });
  res.json({ group: result.group });
});

// Преподаватель исключает участника
app.delete('/api/groups/:groupId/members/:memberId', requireAuth, (req, res) => {
  const groupId = Number(req.params.groupId);
  const memberId = req.params.memberId;
  if (!Number.isFinite(groupId)) return res.status(400).json({ error: 'invalid request' });
  const result = removeMember({ groupId, teacherId: req.userId, memberId });
  if (result.error === 'forbidden') return res.status(403).json({ error: 'forbidden' });
  if (result.error === 'cannot_remove_self') return res.status(400).json({ error: 'Нельзя исключить себя' });
  res.json({ ok: result.ok });
});

app.delete('/api/groups/:groupId', requireAuth, (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isFinite(groupId)) return res.status(400).json({ error: 'invalid request' });
  const ok = deleteGroup({ groupId, teacherId: req.userId });
  if (!ok) return res.status(404).json({ error: 'not found or forbidden' });
  res.json({ ok: true });
});

app.get('/api/groups/:groupId', requireAuth, (req, res) => {
  const groupId = Number(req.params.groupId);
  const group = getGroup(groupId);
  if (!group) return res.status(404).json({ error: 'not found' });
  res.json({
    group,
    members: listGroupMembers(groupId),
    ideas: listGroupIdeas(groupId),
    assignments: listAssignments(groupId),
  });
});

// --- assignments ---

app.post('/api/groups/:groupId/assignments', requireAuth, (req, res) => {
  const groupId = Number(req.params.groupId);
  const { title, description, params, dueAt } = req.body || {};
  if (!Number.isFinite(groupId)) return res.status(400).json({ error: 'invalid request' });
  const a = createAssignment({ groupId, teacherId: req.userId, title, description, params, dueAt });
  if (!a) return res.status(403).json({ error: 'forbidden' });
  res.json({ assignment: a });
});

app.get('/api/assignments/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const a = getAssignment(id);
  if (!a) return res.status(404).json({ error: 'not found' });
  res.json({ assignment: a, submissions: listAssignmentSubmissions(id) });
});

app.delete('/api/assignments/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const userId = req.userId;
  if (!Number.isFinite(id) || !userId) return res.status(400).json({ error: 'invalid request' });
  const ok = deleteAssignment({ assignmentId: id, teacherId: userId });
  if (!ok) return res.status(404).json({ error: 'not found or forbidden' });
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`IdeaForge API → http://localhost:${PORT}`);
});
