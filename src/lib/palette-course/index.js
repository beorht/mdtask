// Предмет «Цвет и палитра» (план docs/todo/2026-11-11-palette-trainer-plan.md). Темы (content/palette/topics.json);
// у готовой темы своя папка: theory.md и tasks.js. В задаче даётся готовый шаблон страницы (разметка с классами/id
// + base.css без цветов, content/palette/templates/<name>.{html,base.css}); студент пишет обычный CSS к классам
// (без переменных), подбирая цвет color-picker'ом. Проверяет сервер по правилам теории цвета на ВЫЧИСЛЕННЫХ цветах
// (validate.js через движок каскада CSS-курса + public/js/color-engine.js). Порядок: сначала теория, затем практика;
// следующая тема открывается, когда решены все задачи предыдущей. Курс видят только TEST (PALETTE_GROUPS пуст).
const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');
const { checkPalette } = require('./validate');
const topicLocks = require('../topic-locks');

const SUBJECT_KEY = 'palette';
const SUBJECT_TITLE = 'Цвет и палитра';
const SUBJECT_BASE = '/subjects/palette';
const SUBJECT_ICON = '🎨';
const PALETTE_GROUPS = ['web-1'];
const SUBJECT_LEAD = 'Готовые страницы без цвета: подберите подходящую палитру. Вы пишете обычный CSS к готовым классам и выбираете цвет пипеткой, а тренажёр проверяет не «попадание в эталон», а теорию цвета — контраст, гармонию, акцент. Темы открываются по порядку.';

const DIR = path.join(__dirname, '..', '..', '..', 'content', 'palette');
const MAX_CODE = 20000;
const MAX_AWAY = 12 * 60 * 60 * 1000;
const read = (...p) => fs.readFileSync(path.join(DIR, ...p), 'utf-8');

// Шаблоны страниц (кэш): body-фрагмент + base.css без цветов.
const templateCache = new Map();
function loadTemplate(name) {
  if (!templateCache.has(name)) {
    templateCache.set(name, {
      html: read('templates', `${name}.html`),
      baseCss: read('templates', `${name}.base.css`),
    });
  }
  return templateCache.get(name);
}

const TOPICS = JSON.parse(read('topics.json')).map((t, ti) => {
  const ready = fs.existsSync(path.join(DIR, t.dir, 'tasks.js'));
  const tasks = ready
    ? require(path.join(DIR, t.dir, 'tasks.js')).map((task, i) => ({ input: 'picker', ...task, number: i + 1, topic: t.key }))
    : [];
  return { key: t.key, dir: t.dir, title: t.title, lead: t.lead, number: ti + 1, ready, tasks, theoryMd: ready ? read(t.dir, 'theory.md') : '' };
});
const TOPIC_BY_KEY = new Map(TOPICS.map((t) => [t.key, t]));
const TASK_BY_ID = new Map(TOPICS.flatMap((t) => t.tasks.map((task) => [task.id, task])));
const theoryId = (topicKey) => `${topicKey}:theory`;

function canSeeSubject(user) {
  return !!user && user.role === 'student' && (hasFullAccess(user) || PALETTE_GROUPS.includes(user.group));
}

const emptyStats = () => ({ attempts: 0, bestChecks: 0, pastes: 0, aways: 0, awayMs: 0, lastAt: null });
function progressMap(studentId) {
  return new Map(db.getPaletteProgress(studentId).map((p) => [p.itemId, { ...p, stats: { ...emptyStats(), ...p.stats } }]));
}

/** Заготовка CSS для редактора: по одному правилу на селектор роли с пустыми значениями цвета. */
function cssProp(prop) { return prop === 'color' ? 'color' : prop === 'border' ? 'border-color' : 'background'; }
function skeletonFor(task) {
  const bySelector = new Map();
  for (const role of task.roles) {
    if (!bySelector.has(role.selector)) bySelector.set(role.selector, []);
    bySelector.get(role.selector).push(cssProp(role.prop));
  }
  return [...bySelector.entries()]
    .map(([sel, props]) => `${sel} {\n${[...new Set(props)].map((p) => `  ${p}: ;`).join('\n')}\n}`)
    .join('\n\n') + '\n';
}

/** Темы со статусом для студента: что прочитано, решено и открыто. */
function topicsForStudent(user) {
  const full = hasFullAccess(user);
  const progress = progressMap(user.id);
  const solved = (id) => Boolean(progress.get(id) && progress.get(id).solvedAt);
  let previousDone = true;
  return TOPICS.map((t) => {
    const tasks = t.tasks.map((task) => ({ id: task.id, number: task.number, title: task.title, solved: solved(task.id), tried: Boolean(progress.get(task.id) && progress.get(task.id).stats.attempts) }));
    const theoryRead = progress.has(theoryId(t.key));
    const done = t.ready && tasks.every((x) => x.solved);
    const lock = topicLocks.lockState(SUBJECT_KEY, t.key, user);
    let theoryOpen = t.ready && (full || previousDone);
    let practiceOpen = theoryOpen && (full || theoryRead);
    if (lock.forcedOpen) { theoryOpen = t.ready; practiceOpen = t.ready; }
    if (lock.locked) { theoryOpen = false; practiceOpen = false; }
    previousDone = previousDone && done;
    return {
      key: t.key, dir: t.dir, number: t.number, title: t.title, lead: t.lead, ready: t.ready,
      tasks,
      solved: tasks.filter((x) => x.solved).length, total: tasks.length,
      theoryRead, theoryOpen, practiceOpen, tasksDone: done, done,
      adminLocked: lock.locked, deadline: lock.deadline, deadlineText: lock.deadlineText, lockReason: lock.reason, overdue: lock.overdue,
    };
  });
}

function summaryForStudent(user) {
  const topics = topicsForStudent(user);
  const ready = topics.filter((t) => t.ready);
  return {
    topics,
    solved: ready.reduce((n, t) => n + t.solved, 0),
    total: ready.reduce((n, t) => n + t.total, 0),
    current: ready.find((t) => t.theoryOpen && !t.done) || null,
  };
}

function topicFor(user, key) { return topicsForStudent(user).find((t) => t.key === key) || null; }

function markTheoryRead(user, topicKey) {
  const id = theoryId(topicKey);
  const item = progressMap(user.id).get(id);
  db.savePaletteItem(user.id, id, { stats: { ...(item ? item.stats : emptyStats()), lastAt: new Date().toISOString() }, solvedAt: item ? item.solvedAt : new Date().toISOString() });
}

/** Задача для страницы: условие, роли (для пипетки), правила (принципы, не эталон), шаблон, черновик, состояние. */
function taskView(user, task) {
  const item = progressMap(user.id).get(task.id);
  const template = loadTemplate(task.template);
  return {
    id: task.id, number: task.number, title: task.title, prompt: task.prompt, input: task.input,
    brand: task.brand || null,
    roles: task.roles.map((r) => ({ key: r.key, selector: r.selector, prop: r.prop, label: r.label })),
    rules: task.rules,
    template: { html: template.html, baseCss: template.baseCss },
    skeleton: skeletonFor(task),
    draft: item ? item.draft || '' : '',
    solved: Boolean(item && item.solvedAt),
    stats: item ? item.stats : emptyStats(),
  };
}

class PaletteError extends Error { constructor(status, message) { super(message); this.status = status; } }

function readCode(code) {
  if (typeof code !== 'string' || code.length > MAX_CODE) throw new PaletteError(400, `CSS не пришёл или длиннее ${MAX_CODE} символов.`);
  return code;
}

function saveDraft(user, task, code) {
  const item = progressMap(user.id).get(task.id);
  db.savePaletteItem(user.id, task.id, { draft: readCode(code), stats: item ? item.stats : emptyStats(), solvedAt: item ? item.solvedAt : null });
}

/** «Проверить»: сервер вычисляет цвета ролей и проверяет правила теории цвета. */
function checkPractice(user, task, body, now = new Date().toISOString()) {
  const code = readCode(body && body.code);
  const template = loadTemplate(task.template);
  const res = checkPalette(template, task, code);
  const item = progressMap(user.id).get(task.id);
  const stats = { ...(item ? item.stats : emptyStats()) };
  stats.attempts += 1;
  const passedNow = res.checks.filter((c) => c.ok).length;
  stats.bestChecks = Math.max(stats.bestChecks, passedNow);
  stats.lastAt = now;
  const solvedAt = (item && item.solvedAt) || (res.success ? now : null);
  db.savePaletteItem(user.id, task.id, { draft: code, stats, solvedAt });
  db.addPaletteAttempt(user.id, task.id, { code, passed: passedNow, total: res.checks.length, success: res.success });
  return { success: res.success, checks: res.checks, everSolved: Boolean(solvedAt) };
}

function recordEvent(user, itemId, body) {
  const item = progressMap(user.id).get(itemId);
  const stats = { ...(item ? item.stats : emptyStats()) };
  if (body && body.type === 'paste') stats.pastes += 1;
  else if (body && body.type === 'away' && Number.isFinite(body.ms) && body.ms > 0) { stats.aways += 1; stats.awayMs += Math.min(Math.round(body.ms), MAX_AWAY); }
  else throw new PaletteError(400, 'Некорректное событие.');
  db.savePaletteItem(user.id, itemId, { draft: item ? item.draft : null, stats, solvedAt: item ? item.solvedAt : null });
  return { ok: true };
}

module.exports = {
  SUBJECT_KEY, SUBJECT_TITLE, SUBJECT_BASE, SUBJECT_ICON, SUBJECT_LEAD, PALETTE_GROUPS,
  TOPICS, TOPIC_BY_KEY, TASK_BY_ID,
  PaletteError, canSeeSubject, progressMap, loadTemplate, skeletonFor,
  topicsForStudent, summaryForStudent, topicFor,
  markTheoryRead, taskView, saveDraft, checkPractice, recordEvent,
};
