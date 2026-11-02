// Админ-блокировки и дедлайны тем по предметам. Ядро: без зависимостей от модулей предметов (они, наоборот,
// зовут отсюда lockState), чтобы не было циклов. Реестр тем для админки — в src/lib/subject-topics.js.
//
// Приоритет при разрешении: студент > группа > открыто. TEST/hasFullAccess не блокируется никогда.
const db = require('../db');
const { hasFullAccess } = require('./test-access');

const MSK = 'Asia/Tashkent'; // +05, как у аудиторий/экзаменов

function fmt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: MSK, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

// Разобрать одну запись override в состояние (без учёта приоритета — это делает resolve()).
function stateOf(row) {
  if (!row) return null;
  if (row.mode === 'allow') return { locked: false, forcedOpen: true, deadline: null, deadlineText: '', overdue: false, reason: '', note: row.note || '' };
  if (row.mode === 'lock') return { locked: true, forcedOpen: false, deadline: null, deadlineText: '', overdue: false, reason: 'Закрыто преподавателем', note: row.note || '' };
  if (row.mode === 'deadline') {
    const passed = row.deadline && Date.now() >= Date.parse(row.deadline);
    return passed
      ? { locked: true, forcedOpen: false, deadline: row.deadline, deadlineText: fmt(row.deadline), overdue: true, reason: `Срок прошёл: ${fmt(row.deadline)}`, note: row.note || '' }
      : { locked: false, forcedOpen: false, deadline: row.deadline, deadlineText: fmt(row.deadline), overdue: false, reason: '', note: row.note || '' };
  }
  return null;
}

const OPEN = { locked: false, forcedOpen: false, deadline: null, deadlineText: '', overdue: false, reason: '', note: '' };

/** Состояние темы для студента: { locked, forcedOpen, deadline, overdue, reason, note, scope }. */
function lockState(subject, topicKey, user) {
  if (!user || hasFullAccess(user)) return { ...OPEN };
  const rows = db.topicOverridesForStudent(subject, user.group, user.id)
    .filter((r) => r.topic_key === topicKey);
  const studentRow = rows.find((r) => r.scope === 'student');
  const groupRow = rows.find((r) => r.scope === 'group');
  const st = stateOf(studentRow);
  if (st) return { ...st, scope: 'student' }; // студент решает всё (и закрыть, и открыть)
  const gr = stateOf(groupRow);
  if (gr) return { ...gr, scope: 'group' };
  return { ...OPEN };
}

/** true, если тема закрыта для студента. */
function isLocked(subject, topicKey, user) {
  return lockState(subject, topicKey, user).locked;
}

/**
 * Middleware: закрывает вход в тему. subject — ключ предмета, getTopicKey(req) → ключ темы.
 * GET → страница 423 topic-locked; остальное → 423 JSON.
 */
function requireTopicOpen(subject, getTopicKey) {
  return function (req, res, next) {
    const user = req.session && req.session.user;
    const topicKey = getTopicKey(req);
    const state = topicKey ? lockState(subject, topicKey, user) : { ...OPEN };
    if (!state.locked) return next();
    if (req.method !== 'GET') return res.status(423).json({ error: state.reason || 'Тема закрыта преподавателем.' });
    return res.status(423).render('topic-locked', { user, state });
  };
}

module.exports = { lockState, isLocked, requireTopicOpen, fmt };
