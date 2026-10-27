// Предмет «Web-разработка: HTML» (план docs/todo/2026-10-26-web-html-subject.md). Темы — content/html/topics.json;
// у готовой темы своя папка: theory.md (теория с живыми примерами, theory.js) и tasks.json + tasks/<id>.html
// (условие и ожидаемый HTML задания). Каждая тема — N.1 теория и N.2 практическая работа в окне по образцу
// EmmetEmulator (клиент emmet/src/html/, собран в public/vendor/html-course/). Задания общие для всех; HTML пишут
// руками или через Emmet; каждую попытку сервер перепроверяет сам (../emmet/validate.js).
// Темы открываются по порядку: теория — после практики предыдущей темы, практика — после прочтения теории.
// Виден группам из HTML_GROUPS и TEST (hasFullAccess).
const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');
const { checkAttempt } = require('../emmet/validate');

const HTML_KEY = 'html';
const HTML_TITLE = 'Web-разработка: HTML';
const HTML_ICON = '🌐';
const HTML_GROUPS = ['web-1', 'web-2']; // с 27.10.2026

const DIR = path.join(__dirname, '..', '..', '..', 'content', 'html');
const read = (...parts) => fs.readFileSync(path.join(DIR, ...parts), 'utf-8');

const TOPICS = JSON.parse(read('topics.json')).map((t, i) => {
  const ready = fs.existsSync(path.join(DIR, t.dir, 'tasks.json'));
  const tasks = ready
    ? JSON.parse(read(t.dir, 'tasks.json')).map((task, j) => ({
      ...task,
      number: j + 1,
      topic: t.key,
      expectedHtml: read(t.dir, 'tasks', `${task.id}.html`).trimEnd(),
    }))
    : [];
  return { ...t, number: i + 1, ready, tasks, theoryMd: ready ? read(t.dir, 'theory.md') : '' };
});
const TOPIC_BY_KEY = new Map(TOPICS.map((t) => [t.key, t]));
const TASK_BY_ID = new Map(TOPICS.flatMap((t) => t.tasks.map((task) => [task.id, task])));
const theoryId = (topicKey) => `${topicKey}:theory`;

const STATUSES = new Set(['success', 'partial', 'error', 'mismatch']);
const BLOCKED_KINDS = new Set(['paste', 'drop', 'bulk']);
const MAX_CODE = 20000;
const MAX_AWAY = 12 * 60 * 60 * 1000;
const AWAY_SUSPICIOUS = 15000;
const SOLVE_WINDOW = 2 * 60000;

function canSeeHtml(user) {
  return !!user && user.role === 'student' && (hasFullAccess(user) || HTML_GROUPS.includes(user.group));
}

const emptyStats = () => ({
  openedAt: null,
  lastAt: null,
  attempts: 0,
  success: 0,
  partial: 0,
  error: 0,
  mismatch: 0,
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
  clientMismatch: 0,
});

function progressMap(studentId) {
  return new Map(db.getHtmlProgress(studentId).map((p) => [p.itemId, { ...emptyStats(), ...p.stats }]));
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
  db.saveHtmlProgress(user.id, id, stats);
}

// Что уходит в браузер: условие и ожидаемый HTML (его вид — образец слева снизу; код образца не показывается).
function publicTask(task) {
  return { id: task.id, title: task.title, description: task.description, mode: 'html', section: 'html', expectedHtml: task.expectedHtml };
}

function me(user, topicKey) {
  const topic = TOPIC_BY_KEY.get(topicKey);
  const progress = progressMap(user.id);
  return {
    student: { id: user.id, name: user.name },
    topic: { key: topic.key, number: topic.number, title: topic.title },
    exercises: topic.tasks.map(publicTask),
    progress: { solved: topic.tasks.filter((t) => progress.get(t.id) && progress.get(t.id).solvedAt).map((t) => t.id) },
  };
}

class HtmlCourseError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseEvent(body, topic) {
  const { type, exerciseId } = body || {};
  if (!topic.tasks.some((t) => t.id === exerciseId)) throw new HtmlCourseError(400, 'Такого задания нет в этой теме.');
  if (type === 'open') return { type, itemId: exerciseId };
  if (type === 'paste' && BLOCKED_KINDS.has(body.kind)) return { type, itemId: exerciseId, kind: body.kind };
  if (type === 'away' && Number.isFinite(body.ms) && body.ms > 0) return { type, itemId: exerciseId, ms: Math.min(Math.round(body.ms), MAX_AWAY) };
  if (type === 'attempt' && STATUSES.has(body.status)) {
    return { type, itemId: exerciseId, clientStatus: body.status, code: String(body.code ?? '').slice(0, MAX_CODE) };
  }
  throw new HtmlCourseError(400, 'Некорректное событие.');
}

// Событие практики: статистика задания + строка журнала. Статус попытки — по проверке сервера.
function recordEvent(user, topicKey, body, now = new Date().toISOString()) {
  const event = parseEvent(body, TOPIC_BY_KEY.get(topicKey));
  const stats = { ...emptyStats(), ...(progressMap(user.id).get(event.itemId) || {}) };
  stats.openedAt = stats.openedAt || now;
  stats.lastAt = now;
  if (event.type === 'paste') stats.pastes += 1;
  if (event.type === 'away') {
    stats.aways += 1;
    stats.awayMs += event.ms;
    stats.lastAwayMs = event.ms;
    stats.lastReturnAt = now;
  }
  if (event.type === 'attempt') {
    event.status = checkAttempt(event.code, TASK_BY_ID.get(event.itemId));
    stats.attempts += 1;
    stats[event.status] += 1;
    if (event.status !== event.clientStatus) stats.clientMismatch += 1;
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
  db.saveHtmlProgress(user.id, event.itemId, stats);
  db.addHtmlEvent({ studentId: user.id, ...event, at: now });
  return { ok: true, status: event.status || null };
}

module.exports = {
  HTML_KEY,
  HTML_TITLE,
  HTML_ICON,
  HTML_GROUPS,
  TOPICS,
  TOPIC_BY_KEY,
  TASK_BY_ID,
  HtmlCourseError,
  canSeeHtml,
  progressMap,
  topicsForStudent,
  summaryForStudent,
  topicFor,
  markTheoryRead,
  publicTask,
  me,
  recordEvent,
};
