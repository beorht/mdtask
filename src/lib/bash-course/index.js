// Предмет «Bash: скрипты в Linux» (план docs/todo/2026-11-10-bash-subject-plan.md). 10 тем (content/bash/topics.json);
// у готовой темы своя папка: theory.md (теория с запускаемыми примерами), tasks.json (практика: задачи с тестами
// «аргументы+ввод → ожидаемый stdout») и tests.json (квиз: вопросы с выбором ответа). Скрипт студента выполняет
// движок bash (public/js/bash-engine.js) в браузере — для «Запустить» и подсказок, а засчитывает сервер тем же
// движком (validate.js). Квиз проверяется на сервере, правильный ответ в браузер до ответа не отдаётся.
// Порядок: сначала теория, затем практика и тест; следующая тема открывается, когда решены все задачи и верно
// отвечены все вопросы предыдущей. Курс видят только TEST (BASH_COURSE_GROUPS пуст, hasFullAccess).
const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');
const { checkTask, publicTests } = require('./validate');
const { checkRules, ruleLabel } = require('./rules');
const topicLocks = require('../topic-locks');

const SUBJECT_KEY = 'bash';
const SUBJECT_TITLE = 'Bash: скрипты в Linux';
const SUBJECT_BASE = '/subjects/bash';
const BASH_COURSE_GROUPS = ['ib-2'];
const SUBJECT_LEAD = 'Скрипты для Linux с нуля: в каждой теме сначала теория с примерами, которые можно запустить прямо на странице, затем практика — много задач с автопроверкой вывода, и тест с вопросами «что выведет код» и «найдите ошибку». Темы открываются по порядку.';

const DIR = path.join(__dirname, '..', '..', '..', 'content', 'bash');
const MAX_CODE = 20000;
const MAX_AWAY = 12 * 60 * 60 * 1000;
const read = (...p) => fs.readFileSync(path.join(DIR, ...p), 'utf-8');

const TOPICS = JSON.parse(read('topics.json')).map((t, ti) => {
  const ready = fs.existsSync(path.join(DIR, t.dir, 'tasks.json'));
  const tasks = ready ? JSON.parse(read(t.dir, 'tasks.json')).map((task, i) => ({ forbid: [], require: [], openTests: 2, ...task, number: i + 1, topic: t.key })) : [];
  const quiz = ready && fs.existsSync(path.join(DIR, t.dir, 'tests.json')) ? JSON.parse(read(t.dir, 'tests.json')).map((q, i) => ({ ...q, number: i + 1, topic: t.key })) : [];
  return { key: t.key, dir: t.dir, title: t.title, lead: t.lead, number: ti + 1, ready, tasks, quiz, theoryMd: ready ? read(t.dir, 'theory.md') : '' };
});
const TOPIC_BY_KEY = new Map(TOPICS.map((t) => [t.key, t]));
const TASK_BY_ID = new Map(TOPICS.flatMap((t) => t.tasks.map((task) => [task.id, task])));
const QUIZ_BY_ID = new Map(TOPICS.flatMap((t) => t.quiz.map((q) => [q.id, q])));
const theoryId = (topicKey) => `${topicKey}:theory`;

function canSeeSubject(user) {
  return !!user && user.role === 'student' && (hasFullAccess(user) || BASH_COURSE_GROUPS.includes(user.group));
}

const emptyStats = () => ({ attempts: 0, bestPassed: 0, total: 0, pastes: 0, aways: 0, awayMs: 0, lastAt: null });
function progressMap(studentId) {
  return new Map(db.getBashCourseProgress(studentId).map((p) => [p.itemId, { ...p, stats: { ...emptyStats(), ...p.stats } }]));
}

/** Темы со статусом для студента: что прочитано, решено (практика), отвечено (квиз) и открыто. */
function topicsForStudent(user) {
  const full = hasFullAccess(user);
  const progress = progressMap(user.id);
  const solved = (id) => Boolean(progress.get(id) && progress.get(id).solvedAt);
  let previousDone = true;
  return TOPICS.map((t) => {
    const tasks = t.tasks.map((task) => ({ id: task.id, number: task.number, title: task.title, solved: solved(task.id), tried: Boolean(progress.get(task.id) && progress.get(task.id).stats.attempts) }));
    const quiz = t.quiz.map((q) => ({ id: q.id, number: q.number, solved: solved(q.id), tried: Boolean(progress.get(q.id) && progress.get(q.id).stats.attempts) }));
    const theoryRead = progress.has(theoryId(t.key));
    const tasksDone = t.ready && tasks.every((x) => x.solved);
    const quizDone = t.ready && quiz.every((x) => x.solved);
    const done = tasksDone && quizDone;
    // Блокировки и дедлайны (/admin/locks): приоритет студент > группа; TEST/hasFullAccess не блокируется.
    const lock = topicLocks.lockState(SUBJECT_KEY, t.key, user);
    let theoryOpen = t.ready && (full || previousDone);
    let practiceOpen = theoryOpen && (full || theoryRead);
    if (lock.forcedOpen) { theoryOpen = t.ready; practiceOpen = t.ready; }
    if (lock.locked) { theoryOpen = false; practiceOpen = false; }
    previousDone = previousDone && done;
    return {
      key: t.key, dir: t.dir, number: t.number, title: t.title, lead: t.lead, ready: t.ready,
      tasks, quiz,
      solved: tasks.filter((x) => x.solved).length, total: tasks.length,
      quizSolved: quiz.filter((x) => x.solved).length, quizTotal: quiz.length,
      theoryRead, theoryOpen, practiceOpen, tasksDone, quizDone, done,
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
    quizSolved: ready.reduce((n, t) => n + t.quizSolved, 0),
    quizTotal: ready.reduce((n, t) => n + t.quizTotal, 0),
    current: ready.find((t) => t.theoryOpen && !t.done) || null,
  };
}

function topicFor(user, key) { return topicsForStudent(user).find((t) => t.key === key) || null; }

function markTheoryRead(user, topicKey) {
  const id = theoryId(topicKey);
  const item = progressMap(user.id).get(id);
  db.saveBashCourseItem(user.id, id, { stats: { ...(item ? item.stats : emptyStats()), lastAt: new Date().toISOString() }, solvedAt: item ? item.solvedAt : new Date().toISOString() });
}

/** Задача для страницы: условие, тесты (ожидаемый вывод — только у открытых), правила, черновик, состояние. */
function taskView(user, task) {
  const item = progressMap(user.id).get(task.id);
  return {
    id: task.id, number: task.number, title: task.title, statement: task.statement,
    tests: publicTests(task),
    forbid: task.forbid, require: task.require,
    forbidLabels: task.forbid.map(ruleLabel), requireLabels: task.require.map(ruleLabel),
    draft: item ? item.draft || '' : '',
    solved: Boolean(item && item.solvedAt),
    stats: item ? item.stats : emptyStats(),
  };
}

/** Вопросы квиза для страницы: без правильного ответа и без пояснения (их держит сервер). */
function quizView(user, topic) {
  const progress = progressMap(user.id);
  return topic.quiz.map((q) => {
    const item = progress.get(q.id);
    return {
      id: q.id, number: q.number, kind: q.kind, prompt: q.prompt, code: q.code || null, options: q.options,
      solved: Boolean(item && item.solvedAt),
      ...(item && item.lastChoice != null ? { lastChoice: item.lastChoice } : {}),
      ...(item && item.solvedAt ? { explain: q.explain } : {}),
    };
  });
}

class BashCourseError extends Error { constructor(status, message) { super(message); this.status = status; } }

function readCode(code) {
  if (typeof code !== 'string' || code.length > MAX_CODE) throw new BashCourseError(400, `Код не пришёл или длиннее ${MAX_CODE} символов.`);
  return code;
}

function saveDraft(user, task, code) {
  const item = progressMap(user.id).get(task.id);
  db.saveBashCourseItem(user.id, task.id, { draft: readCode(code), stats: item ? item.stats : emptyStats(), solvedAt: item ? item.solvedAt : null });
}

function codeRules(code, task) { return checkRules(code, task); }

/** «Проверить» практику: сервер сам прогоняет скрипт на всех тестах + проверяет правила кода. */
function checkPractice(user, task, body, now = new Date().toISOString()) {
  const code = readCode(body && body.code);
  const rules = codeRules(code, task);
  const check = (rules.syntax || rules.found.length || rules.missing.length)
    ? { tests: [], passed: 0, total: task.tests.length, solved: false }
    : checkTask(task, code);
  const solved = check.solved && !rules.syntax && !rules.found.length && !rules.missing.length;
  const item = progressMap(user.id).get(task.id);
  const stats = { ...(item ? item.stats : emptyStats()) };
  stats.attempts += 1;
  stats.bestPassed = Math.max(stats.bestPassed, check.passed);
  stats.total = check.total;
  stats.lastAt = now;
  const solvedAt = (item && item.solvedAt) || (solved ? now : null);
  db.saveBashCourseItem(user.id, task.id, { draft: code, stats, solvedAt });
  db.addBashCourseAttempt(user.id, task.id, {
    code, passed: check.passed, total: check.total,
    forbidden: [...rules.found, ...rules.missing.map((m) => `нет: ${m}`)],
    results: check.tests.map((t) => ({ passed: t.passed })),
  });
  return { ...check, solved, syntax: rules.syntax, forbidden: rules.found.map(ruleLabel), missing: rules.missing.map(ruleLabel), everSolved: Boolean(solvedAt) };
}

/** Ответ на один вопрос квиза: сервер сверяет с хранимым правильным ответом. */
function answerQuiz(user, quizQuestion, body, now = new Date().toISOString()) {
  const choice = body && body.choice;
  if (!Number.isInteger(choice) || choice < 0 || choice >= quizQuestion.options.length) throw new BashCourseError(400, 'Неверный номер варианта.');
  const correct = choice === quizQuestion.answer;
  const item = progressMap(user.id).get(quizQuestion.id);
  const stats = { ...(item ? item.stats : emptyStats()) };
  stats.attempts += 1;
  stats.lastAt = now;
  const solvedAt = (item && item.solvedAt) || (correct ? now : null);
  db.saveBashCourseItem(user.id, quizQuestion.id, { stats, solvedAt, lastChoice: choice, draft: item ? item.draft : null });
  db.addBashQuizAttempt(user.id, quizQuestion.id, { choice, correct });
  return { correct, answer: correct ? quizQuestion.answer : null, explain: correct ? quizQuestion.explain : null, everSolved: Boolean(solvedAt) };
}

function recordEvent(user, itemId, body) {
  const item = progressMap(user.id).get(itemId);
  const stats = { ...(item ? item.stats : emptyStats()) };
  if (body && body.type === 'paste') stats.pastes += 1;
  else if (body && body.type === 'away' && Number.isFinite(body.ms) && body.ms > 0) { stats.aways += 1; stats.awayMs += Math.min(Math.round(body.ms), MAX_AWAY); }
  else throw new BashCourseError(400, 'Некорректное событие.');
  db.saveBashCourseItem(user.id, itemId, { draft: item ? item.draft : null, stats, solvedAt: item ? item.solvedAt : null });
  return { ok: true };
}

module.exports = {
  SUBJECT_KEY, SUBJECT_TITLE, SUBJECT_BASE, SUBJECT_LEAD, BASH_COURSE_GROUPS,
  TOPICS, TOPIC_BY_KEY, TASK_BY_ID, QUIZ_BY_ID,
  BashCourseError, canSeeSubject, progressMap,
  topicsForStudent, summaryForStudent, topicFor,
  markTheoryRead, taskView, quizView, saveDraft, codeRules,
  checkPractice, answerQuiz, recordEvent,
};
