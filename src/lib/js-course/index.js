// Курс «JavaScript: от синтаксиса до DOM» в предмете JavaScript (план docs/todo/2026-10-27-javascript-course.md). Модули и
// уроки — content/js-course/modules.json; у готового урока своя папка: theory.md (теория, примеры с «▶ Запустить» —
// theory.js) и tasks.json (задачи с тестами «ввод → вывод»). Программа студента выполняется в его браузере
// (public/js/js-worker.js + js-runner.js) по разу на тест, сервер сравнивает только вывод (../python-basics-check.js —
// общая проверка вывода) и проверяет правила кода по тексту (rules.js). Эталонные решения —
// scripts/js-course/solutions/<id>.js (тест проверяет, что они проходят все тесты и соблюдают правила).
// Порядок: теория урока — после практики предыдущего, практика — после прочтения теории; задачи урока — в любом
// порядке. Курс видят группа web-2 (JS_COURSE_GROUPS) и TEST (hasFullAccess); у видящих курс старый предмет
// JavaScript (банк задач и заменённые задания) скрыт, остаются только задания уроков.
const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');
const { publicTests, checkRuns } = require('../python-basics-check');
const { checkRules, ruleLabel } = require('./rules');

const COURSE_TITLE = 'JavaScript: от синтаксиса до DOM';
const COURSE_BASE = '/subjects/javascript/course';
const JS_COURSE_GROUPS = ['web-2'];
const COURSE_LEAD = 'JavaScript с нуля и до работы со страницей: в каждом уроке сначала теория с примерами, которые можно запустить прямо на странице, затем практика — много задач на алгоритмы с автопроверкой в браузере. В последнем модуле — DOM: скрипты для настоящих страниц. Уроки открываются по порядку.';

const DIR = path.join(__dirname, '..', '..', '..', 'content', 'js-course');
const MAX_CODE = 20000;
const MAX_AWAY = 12 * 60 * 60 * 1000;
const read = (...parts) => fs.readFileSync(path.join(DIR, ...parts), 'utf-8');

const MODULES = JSON.parse(read('modules.json')).map((m, mi) => ({
  ...m,
  number: mi + 1,
  lessons: m.lessons.map((l, li) => {
    const ready = fs.existsSync(path.join(DIR, l.dir, 'tasks.json'));
    const number = `${mi + 1}.${li + 1}`;
    const tasks = ready
      ? JSON.parse(read(l.dir, 'tasks.json')).map((t, ti) => ({
        forbid: [],
        require: [],
        openTests: 2,
        ...t,
        number: ti + 1,
        lesson: l.key,
      }))
      : [];
    return { ...l, module: m.key, number, ready, tasks, theoryMd: ready ? read(l.dir, 'theory.md') : '' };
  }),
}));
const LESSONS = MODULES.flatMap((m) => m.lessons);

// Задания со сдачей по JavaScript (content/js-course/assignments.json): у видящих курс — внутри своих уроков (📎);
// replacedBy — задание переделано в задачи практики уроков (таким студентам не показывается).
const ASSIGNMENT_RULES = JSON.parse(read('assignments.json')).rules.map((r) => ({
  lesson: r.lesson,
  replaced: Boolean(r.replacedBy && r.replacedBy.length),
  re: new RegExp(`^${r.path.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`),
}));

/** Урок курса, к которому относится задание со сдачей (по пути его Markdown), или null. */
function lessonForAssignment(mdPath) {
  const rule = ASSIGNMENT_RULES.find((r) => r.re.test(mdPath || ''));
  return rule ? rule.lesson : null;
}

/** Задание переделано в задачи практики курса (replacedBy) — тем, кому открыт курс, оно не показывается. */
function replacedByCourse(mdPath) {
  const rule = ASSIGNMENT_RULES.find((r) => r.re.test(mdPath || ''));
  return Boolean(rule && rule.replaced);
}
const LESSON_BY_KEY = new Map(LESSONS.map((l) => [l.key, l]));
const TASK_BY_ID = new Map(LESSONS.flatMap((l) => l.tasks.map((t) => [t.id, t])));
const theoryId = (lessonKey) => `${lessonKey}:theory`;

function canSeeCourse(user) {
  return !!user && user.role === 'student' && (hasFullAccess(user) || JS_COURSE_GROUPS.includes(user.group));
}

const emptyStats = () => ({ attempts: 0, bestPassed: 0, total: 0, pastes: 0, aways: 0, awayMs: 0, lastAt: null });

function progressMap(studentId) {
  return new Map(db.getJsCourseProgress(studentId).map((p) => [p.itemId, { ...p, stats: { ...emptyStats(), ...p.stats } }]));
}

/** Уроки со статусом для студента: что прочитано, решено и открыто. */
function lessonsForStudent(user) {
  const full = hasFullAccess(user);
  const progress = progressMap(user.id);
  const solved = (id) => Boolean(progress.get(id) && progress.get(id).solvedAt);
  let previousDone = true;
  return LESSONS.map((l) => {
    const tasks = l.tasks.map((t) => {
      const p = progress.get(t.id);
      return { id: t.id, number: t.number, title: t.title, solved: solved(t.id), tried: Boolean(p && p.stats.attempts) };
    });
    const theoryRead = progress.has(theoryId(l.key));
    const done = l.ready && tasks.every((t) => t.solved);
    const theoryOpen = l.ready && (full || previousDone);
    const practiceOpen = theoryOpen && (full || theoryRead);
    previousDone = previousDone && done;
    return {
      key: l.key,
      module: l.module,
      number: l.number,
      title: l.title,
      kind: l.kind || 'lesson',
      ready: l.ready,
      tasks,
      solved: tasks.filter((t) => t.solved).length,
      total: tasks.length,
      theoryRead,
      theoryOpen,
      practiceOpen,
      done,
    };
  });
}

function summaryForStudent(user) {
  const lessons = lessonsForStudent(user);
  const ready = lessons.filter((l) => l.ready);
  return {
    modules: MODULES.map((m) => ({ key: m.key, number: m.number, title: m.title, lead: m.lead, lessons: lessons.filter((l) => l.module === m.key) })),
    lessons,
    solved: ready.reduce((n, l) => n + l.solved, 0),
    total: ready.reduce((n, l) => n + l.total, 0),
    current: ready.find((l) => l.theoryOpen && !l.done) || null,
  };
}

function lessonFor(user, key) {
  return lessonsForStudent(user).find((l) => l.key === key) || null;
}

function markTheoryRead(user, lessonKey) {
  const id = theoryId(lessonKey);
  const item = progressMap(user.id).get(id);
  db.saveJsCourseItem(user.id, id, { stats: { ...(item ? item.stats : emptyStats()), lastAt: new Date().toISOString() }, solvedAt: item ? item.solvedAt : new Date().toISOString() });
}

/** Задача для страницы: условие, тесты (ожидаемый вывод — только у открытых), черновик и состояние. */
function taskView(user, task) {
  const item = progressMap(user.id).get(task.id);
  return {
    id: task.id,
    number: task.number,
    title: task.title,
    statement: task.statement,
    // Ввод и файлы каждого теста нужны браузеру, чтобы запустить программу; ожидаемый вывод — только у открытых.
    tests: publicTests(task).map((t, i) => (task.tests[i].files ? { ...t, files: task.tests[i].files } : t)),
    examples: task.tests.slice(0, task.openTests),
    forbid: task.forbid,
    require: task.require,
    forbidLabels: task.forbid.map(ruleLabel),
    requireLabels: task.require.map(ruleLabel),
    draft: item ? item.draft || '' : '',
    solved: Boolean(item && item.solvedAt),
    stats: item ? item.stats : emptyStats(),
  };
}

class JsCourseError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function readCode(code) {
  if (typeof code !== 'string' || code.length > MAX_CODE) throw new JsCourseError(400, `Код не пришёл или длиннее ${MAX_CODE} символов.`);
  return code;
}

function saveDraft(user, task, code) {
  const item = progressMap(user.id).get(task.id);
  db.saveJsCourseItem(user.id, task.id, { draft: readCode(code), stats: item ? item.stats : emptyStats(), solvedAt: item ? item.solvedAt : null });
}

// Запрещённое и обязательное в коде (rules.js: по тексту, код не выполняется).
function codeRules(code, task) {
  return checkRules(code, task);
}

/** «Проверить»: вывод программы по всем тестам + правила кода. Задача решена, только если всё выполнено. */
function checkTask(user, task, body, now = new Date().toISOString()) {
  const code = readCode(body && body.code);
  let check;
  try {
    check = checkRuns(task, body && body.runs);
  } catch (err) {
    throw new JsCourseError(400, err.message);
  }
  const rules = codeRules(code, task);
  const solved = check.solved && !rules.syntax && !rules.found.length && !rules.missing.length;
  const item = progressMap(user.id).get(task.id);
  const stats = { ...(item ? item.stats : emptyStats()) };
  stats.attempts += 1;
  stats.bestPassed = Math.max(stats.bestPassed, check.passed);
  stats.total = check.total;
  stats.lastAt = now;
  const solvedAt = (item && item.solvedAt) || (solved ? now : null);
  db.saveJsCourseItem(user.id, task.id, { draft: code, stats, solvedAt });
  db.addJsCourseAttempt(user.id, task.id, {
    code,
    passed: check.passed,
    total: check.total,
    forbidden: [...rules.found, ...rules.missing.map((m) => `нет: ${m}`)],
    results: check.tests.map((t) => ({ passed: t.passed, error: t.error })),
  });
  return { ...check, solved, syntax: rules.syntax, forbidden: rules.found.map(ruleLabel), missing: rules.missing.map(ruleLabel), everSolved: Boolean(solvedAt) };
}

/** Вставка (заблокирована в редакторе) и уход со страницы — для сигналов преподавателю. */
function recordEvent(user, task, body) {
  const item = progressMap(user.id).get(task.id);
  const stats = { ...(item ? item.stats : emptyStats()) };
  if (body && body.type === 'paste') stats.pastes += 1;
  else if (body && body.type === 'away' && Number.isFinite(body.ms) && body.ms > 0) {
    stats.aways += 1;
    stats.awayMs += Math.min(Math.round(body.ms), MAX_AWAY);
  } else throw new JsCourseError(400, 'Некорректное событие.');
  db.saveJsCourseItem(user.id, task.id, { draft: item ? item.draft : null, stats, solvedAt: item ? item.solvedAt : null });
  return { ok: true };
}

module.exports = {
  COURSE_TITLE,
  COURSE_BASE,
  COURSE_LEAD,
  JS_COURSE_GROUPS,
  MODULES,
  LESSONS,
  LESSON_BY_KEY,
  TASK_BY_ID,
  JsCourseError,
  canSeeCourse,
  progressMap,
  lessonForAssignment,
  replacedByCourse,
  lessonsForStudent,
  summaryForStudent,
  lessonFor,
  markTheoryRead,
  taskView,
  saveDraft,
  codeRules,
  checkTask,
  recordEvent,
};
