// Тренажёр «Emmet · Тетрадь» (перенесён из EmmetEmulator, docs/emmet/, docs/todo/2026-10-26-emmet-integration.md).
// План студента: 12 общих обучающих шагов (lessons.json: анимация-демонстрация и подсказки, как в EmmetEmulatorStudy),
// затем личный набор из 10 работ с условием (exercises.json) и личный набор из 10 работ без подсказок
// (blind.json: виден только ожидаемый HTML) — оба по PLAN 3/2/5 из банков по 30. Клиент (emmet/, собранный в
// public/vendor/emmet/) получает ожидаемый HTML, но не сокращения-эталоны практических работ; каждую попытку
// сервер перепроверяет сам (validate.js), признак «HTML набран руками» присылает браузер.
// Раздел «Контейнеры HTML» отложен для отдельного предмета: docs/emmet/containers/.
const crypto = require('crypto');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');
const { checkAttempt, explainAttempt } = require('./validate');
const typing = require('../typing-check');

const EMMET_KEY = 'emmet';
const EMMET_TITLE = 'Emmet · Тетрадь';
// Тренажёр открыт всем студентам (27.10.2026), в том числе новым аккаунтам и новым группам. Группы для админки
// («Завершить занятие», фильтр) — все группы студентов из базы, кроме TEST.
const emmetGroups = () => db.getDistinctStudentGroups();

const LESSONS = require('./data/lessons.json').map((e) => ({ ...e, section: 'lesson' }));
const EXERCISES = require('./data/exercises.json').map((e) => ({ ...e, section: 'emmet' }));
const BLIND = require('./data/blind.json').map((e) => ({ ...e, section: 'blind' }));
const EXPECTED = require('./data/expected.json');
const ALL = [...LESSONS, ...EXERCISES, ...BLIND];
const BY_ID = new Map(ALL.map((e) => [e.id, { ...e, expectedHtml: EXPECTED[e.id] }]));
const LESSON_IDS = LESSONS.map((e) => e.id);
const BANKS = { emmet: EXERCISES, blind: BLIND };

const PLAN = { 1: 3, 2: 2, 3: 5 };
const SET_SIZE = Object.values(PLAN).reduce((a, b) => a + b, 0);
// Личный набор: SET_SIZE работ с условием, затем SET_SIZE работ без подсказок.
const ASSIGNMENT_SIZE = SET_SIZE * Object.keys(BANKS).length;

const STATUSES = new Set(['success', 'partial', 'error', 'mismatch']);
const MAX_HINTS = 10;
const BLOCKED_KINDS = new Set(['paste', 'drop', 'bulk']);
const MAX_CODE = 20000;
const MAX_AWAY = 12 * 60 * 60 * 1000;
// Решение подозрительно, если сдано вскоре после долгого ухода со страницы.
const AWAY_SUSPICIOUS = 15000;
const SOLVE_WINDOW = 2 * 60000;

function canSeeEmmet(user) {
  return !!user && user.role === 'student';
}

function pick(items, count) {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// Внутри набора работы идут в порядке банка — сложность растёт плавно, у соседей наборы разные.
function createSet(bank) {
  const chosen = new Set();
  for (const [level, count] of Object.entries(PLAN)) {
    pick(bank.filter((e) => e.difficulty === Number(level)), count).forEach((e) => chosen.add(e.id));
  }
  return bank.filter((e) => chosen.has(e.id)).map((e) => e.id);
}

const createAssignment = () => Object.values(BANKS).flatMap(createSet);

function isValidSet(ids, section) {
  if (ids.length !== SET_SIZE) return false;
  if (!ids.every((id) => BY_ID.has(id) && BY_ID.get(id).section === section)) return false;
  return Object.entries(PLAN).every(([level, count]) => ids.filter((id) => BY_ID.get(id).difficulty === Number(level)).length === count);
}

const setOf = (ids, section) => ids.filter((id) => BY_ID.has(id) && BY_ID.get(id).section === section);

function isValidAssignment(ids) {
  if (!Array.isArray(ids) || ids.length !== ASSIGNMENT_SIZE) return false;
  return Object.keys(BANKS).every((section) => isValidSet(setOf(ids, section), section))
    && ids.join() === Object.keys(BANKS).flatMap((section) => setOf(ids, section)).join();
}

// Набор выдаётся при первом обращении и потом не меняется (кроме «Новый набор» в админке).
// Наборы, выданные до появления работ без подсказок (только 10 работ с условием), сохраняются и дополняются.
function assignmentOf(studentId) {
  const stored = db.getEmmetAssignment(studentId);
  if (isValidAssignment(stored)) return stored;
  const ids = Object.entries(BANKS).flatMap(([section, bank]) => {
    const kept = Array.isArray(stored) ? setOf(stored, section) : [];
    return isValidSet(kept, section) ? kept : createSet(bank);
  });
  db.setEmmetAssignment(studentId, ids);
  return ids;
}

function reassign(studentId) {
  db.setEmmetAssignment(studentId, createAssignment());
}

const planOf = (studentId) => [...LESSON_IDS, ...assignmentOf(studentId)];

// Что уходит в браузер. Обучение — с демонстрацией, подсказками и ответом (его открывает последняя подсказка);
// работы с условием — без emmetExpression и уровня; работы без подсказок — только ожидаемый HTML.
function publicExercise(id) {
  const e = BY_ID.get(id);
  const base = { id: e.id, mode: e.mode, section: e.section, expectedHtml: e.expectedHtml };
  if (e.section === 'lesson') {
    return { ...base, title: e.title, topic: e.topic, description: e.description, hints: e.hints, solution: e.emmetExpression, demo: e.demo };
  }
  if (e.section === 'blind') return { ...base, title: 'Повторите образец', description: '' };
  return { ...base, title: e.title, description: e.description };
}

const emptyStats = () => ({
  openedAt: null,
  lastAt: null,
  attempts: 0,
  success: 0,
  partial: 0,
  error: 0,
  mismatch: 0,
  handwritten: 0,
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
  hints: 0,
  solutionShown: false,
});

function progressMap(studentId) {
  return new Map(db.getEmmetProgress(studentId).map((p) => [p.exerciseId, { ...emptyStats(), ...p.stats }]));
}

function sessionClosed(user) {
  if (hasFullAccess(user)) return null;
  return db.getEmmetSessionClosedAt(user.group);
}

function me(user) {
  const plan = planOf(user.id);
  const progress = progressMap(user.id);
  return {
    student: { id: user.id, name: user.name },
    exercises: plan.map(publicExercise),
    progress: { solved: plan.filter((id) => progress.get(id) && progress.get(id).solvedAt) },
  };
}

class EmmetError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function parseEvent(body, plan) {
  const { type, exerciseId } = body || {};
  if (!plan.includes(exerciseId)) throw new EmmetError(400, 'Этой работы нет в вашем наборе.');
  if (type === 'open') return { type, exerciseId };
  // Подсказки есть только в обучении; level — номер открытой подсказки, последняя — ответ.
  if (type === 'hint' && BY_ID.get(exerciseId).section === 'lesson' && Number.isInteger(body.level) && body.level > 0 && body.level <= MAX_HINTS) {
    return { type, exerciseId, level: body.level, kind: body.solution ? 'solution' : `hint-${body.level}` };
  }
  if (type === 'paste' && BLOCKED_KINDS.has(body.kind)) return { type, exerciseId, kind: body.kind };
  if (type === 'away' && Number.isFinite(body.ms) && body.ms > 0) return { type, exerciseId, ms: Math.min(Math.round(body.ms), MAX_AWAY) };
  if (type === 'attempt' && STATUSES.has(body.status)) {
    return { type, exerciseId, clientStatus: body.status, handwritten: Boolean(body.handwritten), code: String(body.code ?? '').slice(0, MAX_CODE), summary: typing.sanitize(body.typing) };
  }
  throw new EmmetError(400, 'Некорректное событие.');
}

// Событие студента: статистика работы (как Store.record в EmmetEmulator) + строка журнала.
// Статус попытки — по серверной проверке; расхождение с браузером считается (clientMismatch).
function recordEvent(user, body, now = new Date().toISOString()) {
  const event = parseEvent(body, planOf(user.id));
  const stats = { ...emptyStats(), ...(progressMap(user.id).get(event.exerciseId) || {}) };
  stats.openedAt = stats.openedAt || now;
  stats.lastAt = now;
  if (event.type === 'paste') stats.pastes += 1;
  if (event.type === 'hint') {
    stats.hints = Math.max(stats.hints, event.level);
    if (event.kind === 'solution') stats.solutionShown = true;
  }
  if (event.type === 'away') {
    stats.aways += 1;
    stats.awayMs += event.ms;
    stats.lastAwayMs = event.ms;
    stats.lastReturnAt = now;
  }
  let hints = [];
  if (event.type === 'attempt') {
    const exercise = BY_ID.get(event.exerciseId);
    event.status = checkAttempt(event.code, exercise, { handwritten: event.handwritten });
    // Как набирался код: признаки «не руками» — сигналы для преподавателя (src/lib/typing-check.js).
    const flags = typing.typingFlags(event.summary, event.code);
    typing.addToStats(stats, flags);
    event.typing = event.summary || flags.length ? { summary: event.summary, flags } : null;
    // Разбор ошибок — кроме работ «без подсказок».
    if (event.status !== 'success' && exercise.section !== 'blind') hints = explainAttempt(event.code, exercise, { handwritten: event.handwritten });
    stats.attempts += 1;
    stats[event.status] += 1;
    if (event.handwritten) stats.handwritten += 1;
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
  db.saveEmmetProgress(user.id, event.exerciseId, stats);
  const { summary, ...logged } = event;
  db.addEmmetEvent({ studentId: user.id, ...logged, at: now });
  return { ok: true, status: event.status || null, hints };
}

function summaryForStudent(user) {
  const plan = planOf(user.id);
  const progress = progressMap(user.id);
  const solved = plan.filter((id) => progress.get(id) && progress.get(id).solvedAt).length;
  return { solved, total: plan.length };
}

module.exports = {
  EMMET_KEY,
  EMMET_TITLE,
  emmetGroups,
  LESSONS,
  EXERCISES,
  BLIND,
  SET_SIZE,
  ASSIGNMENT_SIZE,
  BY_ID,
  EmmetError,
  canSeeEmmet,
  createAssignment,
  isValidAssignment,
  assignmentOf,
  reassign,
  planOf,
  publicExercise,
  emptyStats,
  progressMap,
  sessionClosed,
  me,
  recordEvent,
  summaryForStudent,
};
