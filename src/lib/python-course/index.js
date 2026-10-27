// Курс «Начальный Python» в предмете Python (план docs/todo/2026-10-26-python-beginner-course.md; источник —
// NotionData/…/beginner-course). Модули и уроки — content/python-course/modules.json; у готового урока своя папка:
// theory.md (теория, примеры с «▶ Запустить» — theory.js) и tasks.json (задачи с тестами «ввод → вывод»).
// Урок = N.1 теория + N.2 практика (или мини-проект). Программа студента выполняется в его браузере (Pyodide,
// public/js/python-worker.js) по разу на тест, сервер сравнивает только вывод (../python-basics-check.js) и разбирает
// код (rules.py): запрещённые встроенные функции и обязательные конструкции. Эталонные решения —
// scripts/python-course/solutions/<id>.py (тест проверяет, что они проходят все тесты).
// Порядок: теория урока — после практики предыдущего, практика — после прочтения теории; задачи урока — в любом
// порядке. Пока виден только группе TEST (PYTHON_COURSE_GROUPS пуст, hasFullAccess).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');
const { publicTests, checkRuns } = require('../python-basics-check');

const COURSE_TITLE = 'Начальный Python';
const COURSE_BASE = '/subjects/python/course';
const PYTHON_COURSE_GROUPS = [];

const DIR = path.join(__dirname, '..', '..', '..', 'content', 'python-course');
const RULES_PY = path.join(__dirname, 'rules.py');
const PYTHON = process.env.IB_PYTHON || 'python3';
const MAX_CODE = 20000;
const MAX_AWAY = 12 * 60 * 60 * 1000;
const read = (...parts) => fs.readFileSync(path.join(DIR, ...parts), 'utf-8');

// Учебные модули (requests, dotenv, socket) — content/python-course/shims/; задача перечисляет нужные в `modules`.
const SHIMS = Object.fromEntries(fs.readdirSync(path.join(DIR, 'shims')).filter((f) => f.endsWith('.py'))
  .map((f) => [f.slice(0, -3), read('shims', f)]));

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
        modules: [],
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

// Задания со сдачей по Python и их уроки (content/python-course/assignments.json): в предмете Python показываются
// только они, у видящих курс — внутри своих уроков.
const ASSIGNMENT_RULES = JSON.parse(read('assignments.json')).rules.map((r) => ({
  lesson: r.lesson,
  replaced: Boolean(r.replacedBy && r.replacedBy.length),
  re: new RegExp(`^${r.path.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`),
}));

/** Урок курса, к которому относится задание со сдачей (по пути его Markdown), или null — задание не по Python. */
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
  return !!user && user.role === 'student' && (hasFullAccess(user) || PYTHON_COURSE_GROUPS.includes(user.group));
}

const emptyStats = () => ({ attempts: 0, bestPassed: 0, total: 0, pastes: 0, aways: 0, awayMs: 0, lastAt: null });

function progressMap(studentId) {
  return new Map(db.getPythonCourseProgress(studentId).map((p) => [p.itemId, { ...p, stats: { ...emptyStats(), ...p.stats } }]));
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
  db.savePythonCourseItem(user.id, id, { stats: { ...(item ? item.stats : emptyStats()), lastAt: new Date().toISOString() }, solvedAt: item ? item.solvedAt : new Date().toISOString() });
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
    modules: Object.fromEntries(task.modules.map((name) => [name, SHIMS[name]])),
    forbid: task.forbid,
    require: task.require,
    draft: item ? item.draft || '' : '',
    solved: Boolean(item && item.solvedAt),
    stats: item ? item.stats : emptyStats(),
  };
}

class PythonCourseError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function readCode(code) {
  if (typeof code !== 'string' || code.length > MAX_CODE) throw new PythonCourseError(400, `Код не пришёл или длиннее ${MAX_CODE} символов.`);
  return code;
}

function saveDraft(user, task, code) {
  const item = progressMap(user.id).get(task.id);
  db.savePythonCourseItem(user.id, task.id, { draft: readCode(code), stats: item ? item.stats : emptyStats(), solvedAt: item ? item.solvedAt : null });
}

// Запрещённое и обязательное в коде (rules.py). Если проверить не удалось — не мешаем решению.
function codeRules(code, task) {
  if (!task.forbid.length && !task.require.length) return { syntax: null, found: [], missing: [] };
  const proc = spawnSync(PYTHON, ['-I', RULES_PY], { input: JSON.stringify({ code, forbid: task.forbid, require: task.require }), encoding: 'utf-8', timeout: 10000 });
  if (proc.status !== 0) return { syntax: null, found: [], missing: [], failed: true };
  try {
    return JSON.parse(proc.stdout);
  } catch (err) {
    return { syntax: null, found: [], missing: [], failed: true };
  }
}

/** «Проверить»: вывод программы по всем тестам + правила кода. Задача решена, только если всё выполнено. */
function checkTask(user, task, body, now = new Date().toISOString()) {
  const code = readCode(body && body.code);
  let check;
  try {
    check = checkRuns(task, body && body.runs);
  } catch (err) {
    throw new PythonCourseError(400, err.message);
  }
  const rules = codeRules(code, task);
  const solved = check.solved && !rules.found.length && !rules.missing.length;
  const item = progressMap(user.id).get(task.id);
  const stats = { ...(item ? item.stats : emptyStats()) };
  stats.attempts += 1;
  stats.bestPassed = Math.max(stats.bestPassed, check.passed);
  stats.total = check.total;
  stats.lastAt = now;
  const solvedAt = (item && item.solvedAt) || (solved ? now : null);
  db.savePythonCourseItem(user.id, task.id, { draft: code, stats, solvedAt });
  db.addPythonCourseAttempt(user.id, task.id, {
    code,
    passed: check.passed,
    total: check.total,
    forbidden: [...rules.found, ...rules.missing.map((m) => `нет: ${m}`)],
    results: check.tests.map((t) => ({ passed: t.passed, error: t.error })),
  });
  return { ...check, solved, forbidden: rules.found, missing: rules.missing, everSolved: Boolean(solvedAt) };
}

/** Вставка (заблокирована в редакторе) и уход со страницы — для сигналов преподавателю. */
function recordEvent(user, task, body) {
  const item = progressMap(user.id).get(task.id);
  const stats = { ...(item ? item.stats : emptyStats()) };
  if (body && body.type === 'paste') stats.pastes += 1;
  else if (body && body.type === 'away' && Number.isFinite(body.ms) && body.ms > 0) {
    stats.aways += 1;
    stats.awayMs += Math.min(Math.round(body.ms), MAX_AWAY);
  } else throw new PythonCourseError(400, 'Некорректное событие.');
  db.savePythonCourseItem(user.id, task.id, { draft: item ? item.draft : null, stats, solvedAt: item ? item.solvedAt : null });
  return { ok: true };
}

module.exports = {
  SHIMS,
  COURSE_TITLE,
  COURSE_BASE,
  PYTHON_COURSE_GROUPS,
  MODULES,
  LESSONS,
  LESSON_BY_KEY,
  TASK_BY_ID,
  PythonCourseError,
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
