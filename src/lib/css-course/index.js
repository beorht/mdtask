// Предмет «Web-разработка: CSS» (план docs/todo/2026-10-27-web-css-subject.md). Темы — content/css/topics.json;
// у готовой темы своя папка: theory.md (теория с живыми примерами, theory.js) и tasks.js — задания: условие,
// HTML-разметка (её студент видит и не меняет), эталонный CSS, ширины окна и состояния (:hover…) для проверки,
// правила require / forbid. Студент пишет только CSS.
// Проверка — в браузере (public/js/css-check.js): разметка рисуется с CSS студента и с эталоном, сравниваются
// положение и размер каждого элемента и его видимые стили на каждой ширине и в каждом состоянии. Сервер сам
// проверяет правила по тексту CSS (checkRules) и записывает попытку; вердикт сравнения приходит из браузера.
// Темы открываются по порядку: теория — после практики предыдущей темы, практика — после прочтения теории.
// Виден группам из CSS_GROUPS и TEST (hasFullAccess).
const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');

const CSS_KEY = 'css';
const CSS_TITLE = 'Web-разработка: CSS';
const CSS_ICON = '🎨';
const CSS_GROUPS = ['web-1', 'web-2']; // с 27.10.2026
const DEFAULT_WIDTHS = [800];

const DIR = path.join(__dirname, '..', '..', '..', 'content', 'css');
const read = (...parts) => fs.readFileSync(path.join(DIR, ...parts), 'utf-8');

const TOPICS = JSON.parse(read('topics.json')).map((t, i) => {
  const ready = fs.existsSync(path.join(DIR, t.dir, 'tasks.js'));
  const tasks = ready
    ? require(path.join(DIR, t.dir, 'tasks.js')).map((task, j) => ({
      states: [],
      require: [],
      forbid: [],
      ...task,
      widths: task.widths || DEFAULT_WIDTHS,
      html: task.html.trim(),
      css: task.css.trim(),
      number: j + 1,
      topic: t.key,
    }))
    : [];
  return { ...t, number: i + 1, ready, tasks, theoryMd: ready ? read(t.dir, 'theory.md') : '' };
});
const TOPIC_BY_KEY = new Map(TOPICS.map((t) => [t.key, t]));
const TASK_BY_ID = new Map(TOPICS.flatMap((t) => t.tasks.map((task) => [task.id, task])));
const theoryId = (topicKey) => `${topicKey}:theory`;

const STATUSES = new Set(['success', 'mismatch']);
const BLOCKED_KINDS = new Set(['paste', 'drop', 'bulk']);
const MAX_CODE = 20000;
const MAX_AWAY = 12 * 60 * 60 * 1000;
const AWAY_SUSPICIOUS = 15000;
const SOLVE_WINDOW = 2 * 60000;

function canSeeCss(user) {
  return !!user && user.role === 'student' && (hasFullAccess(user) || CSS_GROUPS.includes(user.group));
}

// --- Правила по тексту CSS -------------------------------------------------------------------------------------
// Правило — строка: «display: flex» (свойство со значением), «grid-template-areas» / «inherit» / «em» (отдельное
// слово — имя свойства, значение или единица: «em» не найдётся внутри «rem»), «:hover», «@media», «var(», «%»
// (встречается в тексте). Комментарии и регистр не учитываются.
const stripComments = (css) => String(css || '').replace(/\/\*[\s\S]*?\*\//g, ' ').toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function ruleMatches(css, rule) {
  const r = rule.toLowerCase().trim();
  const pv = /^([a-z-]+)\s*:\s*(.+)$/.exec(r);
  if (pv) return new RegExp(`(^|[;{\\s])${escapeRe(pv[1])}\\s*:\\s*[^;}]*${escapeRe(pv[2]).replace(/\\ /g, '\\s+')}`).test(css);
  if (/^[a-z-]+$/.test(r)) return new RegExp(`(^|[^a-z-])${escapeRe(r)}(?![a-z-])`).test(css);
  return css.includes(r);
}

const ruleLabel = (rule) => `«${rule}»`;

/** Ошибка правил задания (текст для студента) или null. */
function checkRules(cssText, task) {
  const css = stripComments(cssText);
  const missing = task.require.filter((r) => !ruleMatches(css, r));
  if (missing.length) return `Вид совпал, но в этом задании обязательно ${missing.map(ruleLabel).join(', ')}.`;
  const used = task.forbid.filter((r) => ruleMatches(css, r));
  if (used.length) return `В этом задании нельзя использовать ${used.map(ruleLabel).join(', ')} — сделайте по-другому.`;
  return null;
}

const emptyStats = () => ({
  openedAt: null,
  lastAt: null,
  attempts: 0,
  success: 0,
  mismatch: 0,
  rules: 0,
  pastes: 0,
  aways: 0,
  awayMs: 0,
  lastAwayMs: 0,
  lastReturnAt: null,
  solvedAfterAway: false,
  solvedAt: null,
  attemptsToSolve: null,
  lastStatus: null,
  lastCode: '',
  solvedCode: '',
});

function progressMap(studentId) {
  return new Map(db.getCssProgress(studentId).map((p) => [p.itemId, { ...emptyStats(), ...p.stats }]));
}

/** Темы со статусом для студента: что прочитано, решено и открыто. */
function topicsForStudent(user) {
  const full = hasFullAccess(user);
  const progress = progressMap(user.id);
  const solved = (id) => Boolean(progress.get(id) && progress.get(id).solvedAt);
  let previousDone = true;
  return TOPICS.map((t) => {
    const tasks = t.tasks.map((task) => ({ id: task.id, number: task.number, title: task.title, solved: solved(task.id), tried: Boolean(progress.get(task.id) && progress.get(task.id).attempts) }));
    const theoryRead = progress.has(theoryId(t.key));
    const done = t.ready && tasks.every((task) => task.solved);
    const theoryOpen = t.ready && (full || previousDone);
    const practiceOpen = theoryOpen && (full || theoryRead);
    previousDone = previousDone && done;
    return {
      key: t.key,
      number: t.number,
      title: t.title,
      lead: t.lead,
      ready: t.ready,
      tasks,
      solved: tasks.filter((task) => task.solved).length,
      total: tasks.length,
      theoryRead,
      theoryOpen,
      practiceOpen,
      done,
    };
  });
}

function summaryForStudent(user) {
  const topics = topicsForStudent(user);
  const ready = topics.filter((t) => t.ready);
  return {
    topics,
    solved: ready.reduce((sum, t) => sum + t.solved, 0),
    total: ready.reduce((sum, t) => sum + t.total, 0),
    current: ready.find((t) => t.theoryOpen && !t.done) || null,
  };
}

function topicFor(user, key) {
  return topicsForStudent(user).find((t) => t.key === key) || null;
}

/** Открытие страницы теории отмечает её прочитанной: после этого открывается практика темы. */
function markTheoryRead(user, topicKey, now = new Date().toISOString()) {
  const id = theoryId(topicKey);
  const stats = progressMap(user.id).get(id) || { ...emptyStats(), openedAt: now };
  stats.lastAt = now;
  db.saveCssProgress(user.id, id, stats);
}

// Что уходит в браузер: условие, разметка, правила, ширины и состояния для проверки и эталонный CSS (ref, в base64:
// образец рисуется в браузере, код образца на странице не показывается).
function publicTask(task) {
  return {
    id: task.id,
    number: task.number,
    title: task.title,
    description: task.description,
    html: task.html,
    widths: task.widths,
    states: task.states,
    require: task.require,
    forbid: task.forbid,
    ref: Buffer.from(task.css, 'utf-8').toString('base64'),
  };
}

function me(user, topicKey) {
  const topic = TOPIC_BY_KEY.get(topicKey);
  const progress = progressMap(user.id);
  return {
    student: { id: user.id, name: user.name },
    topic: { key: topic.key, number: topic.number, title: topic.title },
    tasks: topic.tasks.map(publicTask),
    progress: {
      solved: topic.tasks.filter((t) => progress.get(t.id) && progress.get(t.id).solvedAt).map((t) => t.id),
      drafts: Object.fromEntries(topic.tasks.filter((t) => progress.get(t.id) && progress.get(t.id).lastCode).map((t) => [t.id, progress.get(t.id).lastCode])),
    },
  };
}

class CssCourseError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseEvent(body, topic) {
  const { type, exerciseId } = body || {};
  if (!topic.tasks.some((t) => t.id === exerciseId)) throw new CssCourseError(400, 'Такого задания нет в этой теме.');
  if (type === 'open') return { type, itemId: exerciseId };
  if (type === 'paste' && BLOCKED_KINDS.has(body.kind)) return { type, itemId: exerciseId, kind: body.kind };
  if (type === 'away' && Number.isFinite(body.ms) && body.ms > 0) return { type, itemId: exerciseId, ms: Math.min(Math.round(body.ms), MAX_AWAY) };
  if (type === 'attempt' && STATUSES.has(body.status)) {
    return { type, itemId: exerciseId, clientStatus: body.status, code: String(body.code ?? '').slice(0, MAX_CODE) };
  }
  throw new CssCourseError(400, 'Некорректное событие.');
}

// Событие практики: статистика задания + строка журнала. Итог попытки: правила задания (сервер) и сравнение вида
// (браузер); «rules» — вид совпал, но нарушено правило.
function recordEvent(user, topicKey, body, now = new Date().toISOString()) {
  const event = parseEvent(body, TOPIC_BY_KEY.get(topicKey));
  const stats = { ...emptyStats(), ...(progressMap(user.id).get(event.itemId) || {}) };
  stats.openedAt = stats.openedAt || now;
  stats.lastAt = now;
  let message = null;
  if (event.type === 'paste') stats.pastes += 1;
  if (event.type === 'away') {
    stats.aways += 1;
    stats.awayMs += event.ms;
    stats.lastAwayMs = event.ms;
    stats.lastReturnAt = now;
  }
  if (event.type === 'attempt') {
    message = checkRules(event.code, TASK_BY_ID.get(event.itemId));
    event.status = event.clientStatus === 'success' && message ? 'rules' : event.clientStatus;
    stats.attempts += 1;
    stats[event.status] += 1;
    stats.lastStatus = event.status;
    stats.lastCode = event.code;
    if (event.status === 'success' && !stats.solvedAt) {
      stats.solvedAt = now;
      stats.attemptsToSolve = stats.attempts;
      stats.solvedCode = event.code;
      stats.solvedAfterAway = Boolean(stats.lastReturnAt) && stats.lastAwayMs >= AWAY_SUSPICIOUS
        && Date.parse(now) - Date.parse(stats.lastReturnAt) <= SOLVE_WINDOW;
    }
  }
  db.saveCssProgress(user.id, event.itemId, stats);
  db.addCssEvent({ studentId: user.id, ...event, at: now });
  return { ok: true, status: event.status || null, message: event.status === 'rules' ? message : null };
}

module.exports = {
  CSS_KEY,
  CSS_TITLE,
  CSS_ICON,
  CSS_GROUPS,
  TOPICS,
  TOPIC_BY_KEY,
  TASK_BY_ID,
  CssCourseError,
  canSeeCss,
  checkRules,
  progressMap,
  topicsForStudent,
  summaryForStudent,
  topicFor,
  markTheoryRead,
  publicTask,
  me,
  recordEvent,
};
