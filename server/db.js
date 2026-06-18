import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'ideaforge.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
// FULL synchronous + автоматический чекпоинт: данные не «застревают» в WAL,
// поэтому при перезапуске (в т.ч. node --watch) ничего не теряется.
db.pragma('synchronous = FULL');
db.pragma('wal_autocheckpoint = 100');
// На старте сразу сливаем накопленный WAL в основной файл.
try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch { /* пустой WAL — ок */ }

// Грейсфул-шатдаун: при любом завершении процесса чекпоинтим и закрываем БД,
// чтобы записи из WAL гарантированно попали в ideaforge.db.
let closed = false;
function shutdown() {
  if (closed) return;
  closed = true;
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch { /* ignore */ }
  try { db.close(); } catch { /* ignore */ }
}
process.on('exit', shutdown);
process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });
// node --watch шлёт SIGUSR2 перед рестартом — обработаем тоже.
process.once('SIGUSR2', () => { shutdown(); process.kill(process.pid, 'SIGUSR2'); });

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    login        TEXT UNIQUE,
    display_name TEXT NOT NULL,
    pass_hash    TEXT NOT NULL DEFAULT '',
    pass_salt    TEXT NOT NULL DEFAULT '',
    token        TEXT UNIQUE,
    role         TEXT NOT NULL DEFAULT 'student',
    created_at   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
  CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);

  CREATE TABLE IF NOT EXISTS ideas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    params      TEXT NOT NULL,
    is_saved    INTEGER NOT NULL DEFAULT 0,
    share_slug  TEXT UNIQUE,
    assignment_id INTEGER,
    submission_status TEXT NOT NULL DEFAULT 'not_started',
    repo_url    TEXT NOT NULL DEFAULT '',
    student_note TEXT NOT NULL DEFAULT '',
    grade       INTEGER,
    teacher_feedback TEXT NOT NULL DEFAULT '',
    graded_at   INTEGER,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ideas_user ON ideas(user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS groups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id  TEXT NOT NULL,
    name        TEXT NOT NULL,
    join_code   TEXT NOT NULL UNIQUE,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id    INTEGER NOT NULL,
    user_id     TEXT NOT NULL,
    joined_at   INTEGER NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id    INTEGER NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    params      TEXT NOT NULL,
    due_at      INTEGER,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
  );
`);

const asgCols = db.prepare("PRAGMA table_info(assignments)").all().map(r => r.name);
if (!asgCols.includes('due_at')) db.exec("ALTER TABLE assignments ADD COLUMN due_at INTEGER");

// --- light migrations for older DBs ---
const userCols = db.prepare("PRAGMA table_info(users)").all().map(r => r.name);
if (!userCols.includes('login')) db.exec("ALTER TABLE users ADD COLUMN login TEXT");
if (!userCols.includes('display_name')) db.exec("ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT 'User'");
if (!userCols.includes('pass_hash')) db.exec("ALTER TABLE users ADD COLUMN pass_hash TEXT NOT NULL DEFAULT ''");
if (!userCols.includes('pass_salt')) db.exec("ALTER TABLE users ADD COLUMN pass_salt TEXT NOT NULL DEFAULT ''");
if (!userCols.includes('token')) db.exec("ALTER TABLE users ADD COLUMN token TEXT");
if (!userCols.includes('role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'");

const ideaCols = db.prepare("PRAGMA table_info(ideas)").all().map(r => r.name);
if (!ideaCols.includes('share_slug')) db.exec("ALTER TABLE ideas ADD COLUMN share_slug TEXT");
if (!ideaCols.includes('assignment_id')) db.exec("ALTER TABLE ideas ADD COLUMN assignment_id INTEGER");
if (!ideaCols.includes('submission_status')) db.exec("ALTER TABLE ideas ADD COLUMN submission_status TEXT NOT NULL DEFAULT 'not_started'");
if (!ideaCols.includes('repo_url')) db.exec("ALTER TABLE ideas ADD COLUMN repo_url TEXT NOT NULL DEFAULT ''");
if (!ideaCols.includes('student_note')) db.exec("ALTER TABLE ideas ADD COLUMN student_note TEXT NOT NULL DEFAULT ''");
if (!ideaCols.includes('grade')) db.exec("ALTER TABLE ideas ADD COLUMN grade INTEGER");
if (!ideaCols.includes('teacher_feedback')) db.exec("ALTER TABLE ideas ADD COLUMN teacher_feedback TEXT NOT NULL DEFAULT ''");
if (!ideaCols.includes('graded_at')) db.exec("ALTER TABLE ideas ADD COLUMN graded_at INTEGER");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_ideas_slug_uniq ON ideas(share_slug) WHERE share_slug IS NOT NULL");
db.exec("CREATE INDEX IF NOT EXISTS idx_ideas_assignment ON ideas(assignment_id)");

// Чистим зомби-ссылки: assignment_id у идей, ведущий в несуществующее задание
// (FK не работает на колонки, добавленные через ALTER в SQLite)
db.exec(`
  UPDATE ideas SET assignment_id = NULL
  WHERE assignment_id IS NOT NULL
    AND assignment_id NOT IN (SELECT id FROM assignments)
`);

function randomSlug(len = 8) {
  return crypto.randomBytes(len).toString('base64url').slice(0, len);
}

function randomJoinCode() {
  // 6-символьный, без похожих знаков
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// --- auth helpers ---

function uuid() {
  return crypto.randomUUID();
}

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function normalizeLogin(login) {
  return String(login || '').trim().toLowerCase();
}

export function getUser(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) || null;
}

export function getUserByToken(token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM users WHERE token = ?').get(token) || null;
}

export function getUserByLogin(login) {
  return db.prepare('SELECT * FROM users WHERE login = ?').get(normalizeLogin(login)) || null;
}

/**
 * Регистрация по логину/паролю. Возвращает { user, token } либо { error }.
 */
export function registerAccount({ login, password, displayName, role }) {
  const cleanLogin = normalizeLogin(login);
  if (!/^[a-z0-9_.-]{3,24}$/.test(cleanLogin)) return { error: 'bad_login' };
  if (!password || String(password).length < 6) return { error: 'weak_password' };
  if (getUserByLogin(cleanLogin)) return { error: 'login_taken' };

  const id = uuid();
  const token = newToken();
  const { hash, salt } = hashPassword(password);
  const name = (displayName || '').trim().slice(0, 32) || cleanLogin;
  const finalRole = role === 'teacher' ? 'teacher' : 'student';

  db.prepare(`
    INSERT INTO users (id, login, display_name, pass_hash, pass_salt, token, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, cleanLogin, name, hash, salt, token, finalRole, Date.now());

  return { user: getUser(id), token };
}

/**
 * Вход. Возвращает { user, token } либо { error }.
 */
export function loginAccount({ login, password }) {
  const u = getUserByLogin(login);
  if (!u || !u.pass_hash) return { error: 'invalid_credentials' };
  if (!verifyPassword(password, u.pass_salt, u.pass_hash)) return { error: 'invalid_credentials' };
  // Перевыпускаем токен на каждый вход (старые сессии инвалидируются).
  const token = newToken();
  db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, u.id);
  return { user: getUser(u.id), token };
}

export function logoutAccount(userId) {
  db.prepare('UPDATE users SET token = NULL WHERE id = ?').run(userId);
}

/**
 * Смена отображаемого ника.
 */
export function updateDisplayName(userId, displayName) {
  const name = (displayName || '').trim().slice(0, 32);
  if (!name) return { error: 'empty' };
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(name, userId);
  return { user: getUser(userId) };
}

export function publicUser(u) {
  if (!u) return null;
  return {
    userId: u.id,
    login: u.login,
    username: u.display_name,
    role: u.role || 'student',
    joinedAt: u.created_at,
  };
}

export function insertIdea({ userId, title, content, params, assignmentId = null }) {
  const info = db.prepare(`
    INSERT INTO ideas (user_id, title, content, params, is_saved, assignment_id, created_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(userId, title, content, JSON.stringify(params), assignmentId, Date.now());
  return getIdeaById(info.lastInsertRowid);
}

export function getIdeaById(id) {
  const row = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
  return row ? hydrate(row) : null;
}

export function getIdeaBySlug(slug) {
  const row = db.prepare(`
    SELECT i.*, u.display_name as author_username
    FROM ideas i JOIN users u ON u.id = i.user_id
    WHERE i.share_slug = ?
  `).get(slug);
  if (!row) return null;
  const idea = hydrate(row);
  idea.author = { username: row.author_username };
  return idea;
}

export function listIdeas(userId) {
  return db.prepare('SELECT * FROM ideas WHERE user_id = ? ORDER BY created_at DESC').all(userId).map(hydrate);
}

export function deleteIdea(id, userId) {
  const row = db.prepare('SELECT user_id FROM ideas WHERE id = ?').get(id);
  if (!row) return false;
  if (row.user_id !== userId) return false;
  db.prepare('DELETE FROM ideas WHERE id = ?').run(id);
  return true;
}

export function getUserSubmission(assignmentId, userId) {
  const row = db.prepare(`
    SELECT * FROM ideas
    WHERE assignment_id = ? AND user_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(assignmentId, userId);
  return row ? hydrate(row) : null;
}

export function isValidRepoUrl(url) {
  const v = (url || '').trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function updateSubmission({ id, userId, status, repoUrl, studentNote }) {
  const row = db.prepare('SELECT user_id FROM ideas WHERE id = ?').get(id);
  if (!row || row.user_id !== userId) return { error: 'not_found' };

  const cleanRepo = (repoUrl || '').slice(0, 500);
  const cleanNote = (studentNote || '').slice(0, 4000);

  const allowed = ['not_started', 'in_progress', 'done'];
  let nextStatus = allowed.includes(status) ? status : 'not_started';

  // «Готово» можно поставить только при корректной ссылке на репозиторий
  if (nextStatus === 'done' && !isValidRepoUrl(cleanRepo)) {
    return { error: 'repo_required' };
  }

  // Авто-переход: если появилась ссылка/заметка, а статус ещё «Не начато» —
  // переводим в «В работе» (но не трогаем уже выставленное «Готово»).
  if (nextStatus === 'not_started' && (isValidRepoUrl(cleanRepo) || cleanNote.trim())) {
    nextStatus = 'in_progress';
  }

  db.prepare(`
    UPDATE ideas
    SET submission_status = ?, repo_url = ?, student_note = ?
    WHERE id = ?
  `).run(nextStatus, cleanRepo, cleanNote, id);
  return { idea: getIdeaById(id) };
}

export function gradeSubmission({ id, teacherId, grade, feedback }) {
  // Только препод группы, к которой относится задание идеи, может ставить оценку
  const row = db.prepare(`
    SELECT i.id, g.teacher_id
    FROM ideas i
    JOIN assignments a ON a.id = i.assignment_id
    JOIN groups g ON g.id = a.group_id
    WHERE i.id = ?
  `).get(id);
  if (!row || row.teacher_id !== teacherId) return null;
  const g = grade === null || grade === undefined ? null : Math.max(1, Math.min(5, Number(grade)));
  // Выставление оценки автоматически переводит сдачу в «Готово».
  if (g === null) {
    db.prepare(`
      UPDATE ideas SET grade = NULL, teacher_feedback = ?, graded_at = NULL WHERE id = ?
    `).run((feedback || '').slice(0, 4000), id);
  } else {
    db.prepare(`
      UPDATE ideas
      SET grade = ?, teacher_feedback = ?, graded_at = ?, submission_status = 'done'
      WHERE id = ?
    `).run(g, (feedback || '').slice(0, 4000), Date.now(), id);
  }
  return getIdeaById(id);
}

export function toggleBookmark(id) {
  const row = db.prepare('SELECT is_saved FROM ideas WHERE id = ?').get(id);
  if (!row) return null;
  const next = row.is_saved ? 0 : 1;
  db.prepare('UPDATE ideas SET is_saved = ? WHERE id = ?').run(next, id);
  return getIdeaById(id);
}

export function ensureShareSlug(id, userId) {
  const row = db.prepare('SELECT user_id, share_slug FROM ideas WHERE id = ?').get(id);
  if (!row || row.user_id !== userId) return null;
  if (row.share_slug) return row.share_slug;
  // collision-safe loop
  for (let i = 0; i < 5; i++) {
    const slug = randomSlug(8);
    try {
      db.prepare('UPDATE ideas SET share_slug = ? WHERE id = ?').run(slug, id);
      return slug;
    } catch (e) {
      if (!String(e.message).includes('UNIQUE')) throw e;
    }
  }
  return null;
}

export function getProfile(userId) {
  const user = getUser(userId);
  if (!user) return null;
  const ideas = listIdeas(userId);

  const tagCounts = new Map();
  for (const idea of ideas) {
    const stack = idea.params?.techStack ?? [];
    for (const tag of stack) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const favoriteTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  const days = new Set(ideas.map((i) => new Date(i.createdAt).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    userId: user.id,
    login: user.login,
    username: user.display_name,
    role: user.role || 'student',
    joinedAt: user.created_at,
    totalIdeas: ideas.length,
    savedIdeas: ideas.filter((i) => i.is_saved).length,
    favoriteTags,
    streak,
  };
}

// --- groups ---

export function createGroup({ teacherId, name }) {
  // upgrade role if not yet teacher
  db.prepare("UPDATE users SET role = 'teacher' WHERE id = ? AND role != 'teacher'").run(teacherId);
  const cleanName = (name || '').trim().slice(0, 80) || 'Группа';
  for (let i = 0; i < 5; i++) {
    const code = randomJoinCode();
    try {
      const info = db.prepare('INSERT INTO groups (teacher_id, name, join_code, created_at) VALUES (?, ?, ?, ?)')
        .run(teacherId, cleanName, code, Date.now());
      return getGroup(info.lastInsertRowid);
    } catch (e) {
      if (!String(e.message).includes('UNIQUE')) throw e;
    }
  }
  return null;
}

export function getGroup(id) {
  const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
  if (!g) return null;
  return {
    id: g.id,
    teacherId: g.teacher_id,
    name: g.name,
    joinCode: g.join_code,
    createdAt: g.created_at,
  };
}

export function getGroupByCode(code) {
  const g = db.prepare('SELECT * FROM groups WHERE join_code = ?').get(code.toUpperCase());
  return g ? getGroup(g.id) : null;
}

export function listTeacherGroups(teacherId) {
  return db.prepare('SELECT * FROM groups WHERE teacher_id = ? ORDER BY created_at DESC').all(teacherId).map(g => ({
    id: g.id,
    teacherId: g.teacher_id,
    name: g.name,
    joinCode: g.join_code,
    createdAt: g.created_at,
    memberCount: db.prepare('SELECT COUNT(*) as c FROM group_members WHERE group_id = ?').get(g.id).c,
    assignmentCount: db.prepare('SELECT COUNT(*) as c FROM assignments WHERE group_id = ?').get(g.id).c,
  }));
}

export function listStudentGroups(userId) {
  return db.prepare(`
    SELECT g.*, u.display_name as teacher_name
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    JOIN users u ON u.id = g.teacher_id
    WHERE gm.user_id = ?
    ORDER BY gm.joined_at DESC
  `).all(userId).map(g => ({
    id: g.id,
    name: g.name,
    joinCode: g.join_code,
    teacherName: g.teacher_name,
    createdAt: g.created_at,
  }));
}

export function joinGroup({ userId, code }) {
  const group = getGroupByCode(code);
  if (!group) return null;
  if (group.teacherId === userId) return { error: 'Это ваша собственная группа' };
  try {
    db.prepare('INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)')
      .run(group.id, userId, Date.now());
  } catch (e) {
    if (!String(e.message).includes('UNIQUE')) throw e;
  }
  return group;
}

/** Переименование группы её владельцем. */
export function renameGroup({ groupId, teacherId, name }) {
  const group = db.prepare('SELECT teacher_id FROM groups WHERE id = ?').get(groupId);
  if (!group || group.teacher_id !== teacherId) return { error: 'forbidden' };
  const clean = (name || '').trim().slice(0, 80);
  if (!clean) return { error: 'empty' };
  db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(clean, groupId);
  return { group: getGroup(groupId) };
}

export function leaveGroup({ userId, groupId }) {
  const info = db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
  return info.changes > 0;
}

/** Преподаватель исключает участника из своей группы. */
export function removeMember({ groupId, teacherId, memberId }) {
  const group = db.prepare('SELECT teacher_id FROM groups WHERE id = ?').get(groupId);
  if (!group || group.teacher_id !== teacherId) return { error: 'forbidden' };
  if (memberId === teacherId) return { error: 'cannot_remove_self' };
  const info = db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, memberId);
  return { ok: info.changes > 0 };
}

export function deleteGroup({ groupId, teacherId }) {
  const group = db.prepare('SELECT teacher_id FROM groups WHERE id = ?').get(groupId);
  if (!group || group.teacher_id !== teacherId) return false;
  const tx = db.transaction(() => {
    // Зануляем ссылки у идей на задания этой группы (на случай если FK неактивен)
    db.prepare(`
      UPDATE ideas SET assignment_id = NULL
      WHERE assignment_id IN (SELECT id FROM assignments WHERE group_id = ?)
    `).run(groupId);
    db.prepare('DELETE FROM assignments WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
  });
  tx();
  return true;
}

export function listGroupMembers(groupId) {
  return db.prepare(`
    SELECT u.id, u.display_name as username, gm.joined_at,
      (SELECT COUNT(*) FROM ideas WHERE user_id = u.id) as idea_count
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY gm.joined_at ASC
  `).all(groupId).map(r => ({
    userId: r.id,
    username: r.username,
    joinedAt: r.joined_at,
    ideaCount: r.idea_count,
  }));
}

export function listGroupIdeas(groupId) {
  // Лента группы = только сдачи по заданиям ЭТОЙ группы.
  // Идеи, сгенерированные вне задания (assignment_id IS NULL) или относящиеся
  // к заданиям других/удалённых групп, сюда не попадают.
  // Для каждого студента по каждому заданию оставляем только последнюю сдачу,
  // чтобы перегенерации не дублировались.
  return db.prepare(`
    SELECT i.*, u.display_name as author_username
    FROM ideas i
    JOIN assignments a ON a.id = i.assignment_id
    JOIN users u ON u.id = i.user_id
    WHERE a.group_id = ?
      AND i.id = (
        SELECT i2.id FROM ideas i2
        WHERE i2.assignment_id = i.assignment_id AND i2.user_id = i.user_id
        ORDER BY i2.created_at DESC, i2.id DESC
        LIMIT 1
      )
    ORDER BY i.created_at DESC
    LIMIT 200
  `).all(groupId).map(row => {
    const idea = hydrate(row);
    idea.author = { username: row.author_username };
    return idea;
  });
}

// --- assignments ---

export function createAssignment({ groupId, teacherId, title, description, params, dueAt }) {
  const group = db.prepare('SELECT teacher_id FROM groups WHERE id = ?').get(groupId);
  if (!group || group.teacher_id !== teacherId) return null;
  const due = Number.isFinite(Number(dueAt)) && Number(dueAt) > 0 ? Number(dueAt) : null;
  const info = db.prepare(`
    INSERT INTO assignments (group_id, title, description, params, due_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(groupId, (title || 'Задание').slice(0, 120), (description || '').slice(0, 2000), JSON.stringify(params || {}), due, Date.now());
  return getAssignment(info.lastInsertRowid);
}

export function getAssignment(id) {
  const row = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    description: row.description,
    params: safeJSON(row.params),
    dueAt: row.due_at || null,
    createdAt: row.created_at,
  };
}

export function listAssignments(groupId) {
  return db.prepare('SELECT * FROM assignments WHERE group_id = ? ORDER BY created_at DESC').all(groupId).map(row => {
    // Считаем по последней сдаче каждого студента, чтобы перегенерации не накручивали статистику.
    const stats = db.prepare(`
      WITH latest AS (
        SELECT i.* FROM ideas i
        WHERE i.assignment_id = ?
          AND i.id = (
            SELECT i2.id FROM ideas i2
            WHERE i2.assignment_id = i.assignment_id AND i2.user_id = i.user_id
            ORDER BY i2.created_at DESC, i2.id DESC LIMIT 1
          )
      )
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN submission_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN submission_status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN grade IS NOT NULL THEN 1 ELSE 0 END) as graded
      FROM latest
    `).get(row.id);
    return {
      id: row.id,
      groupId: row.group_id,
      title: row.title,
      description: row.description,
      params: safeJSON(row.params),
      dueAt: row.due_at || null,
      createdAt: row.created_at,
      submissionCount: stats.total || 0,
      inProgressCount: stats.in_progress || 0,
      doneCount: stats.done || 0,
      gradedCount: stats.graded || 0,
    };
  });
}

export function listAssignmentSubmissions(assignmentId) {
  // Только последняя сдача каждого студента (перегенерации не дублируются).
  return db.prepare(`
    SELECT i.*, u.display_name as author_username
    FROM ideas i JOIN users u ON u.id = i.user_id
    WHERE i.assignment_id = ?
      AND i.id = (
        SELECT i2.id FROM ideas i2
        WHERE i2.assignment_id = i.assignment_id AND i2.user_id = i.user_id
        ORDER BY i2.created_at DESC, i2.id DESC
        LIMIT 1
      )
    ORDER BY i.created_at DESC
  `).all(assignmentId).map(row => {
    const idea = hydrate(row);
    idea.author = { username: row.author_username };
    return idea;
  });
}

export function deleteAssignment({ assignmentId, teacherId }) {
  const row = db.prepare(`
    SELECT a.id FROM assignments a JOIN groups g ON g.id = a.group_id
    WHERE a.id = ? AND g.teacher_id = ?
  `).get(assignmentId, teacherId);
  if (!row) return false;
  const tx = db.transaction(() => {
    db.prepare('UPDATE ideas SET assignment_id = NULL WHERE assignment_id = ?').run(assignmentId);
    db.prepare('DELETE FROM assignments WHERE id = ?').run(assignmentId);
  });
  tx();
  return true;
}

function hydrate(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    params: safeJSON(row.params),
    isSaved: !!row.is_saved,
    shareSlug: row.share_slug || null,
    assignmentId: row.assignment_id || null,
    submissionStatus: row.submission_status || 'not_started',
    repoUrl: row.repo_url || '',
    studentNote: row.student_note || '',
    grade: row.grade ?? null,
    teacherFeedback: row.teacher_feedback || '',
    gradedAt: row.graded_at || null,
    createdAt: row.created_at,
  };
}

function safeJSON(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

export default db;
