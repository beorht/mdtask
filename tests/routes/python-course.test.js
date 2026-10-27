const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const course = require('../../src/lib/python-course');
const { renderTheory } = require('../../src/lib/python-course/theory');

const ROOT = path.join(__dirname, '..', '..');
const BASE = course.COURSE_BASE;
const solution = (id) => fs.readFileSync(path.join(ROOT, 'scripts', 'python-course', 'solutions', `${id}.py`), 'utf-8');

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'test-1', role: 'student', name: 'Тест Студент', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'ib-1', role: 'student', name: 'Иб Студент', group: 'IB', mustChangePassword: false });
});

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

// Как браузер: «запуски» программы по тестам — здесь вывод берётся из самих тестов (правильный) или портится.
const runsFor = (task, wrong = false) => task.tests.map((t, i) => ({ stdout: wrong && i === task.tests.length - 1 ? 'не то' : t.output, error: null, timeout: false }));

test('6 modules, 54 lessons; written lessons have: theory and 5–10 tasks per lesson', () => {
  assert.strictEqual(course.MODULES.length, 6);
  assert.strictEqual(course.LESSONS.length, 54);
  const ready = course.LESSONS.filter((l) => l.ready);
  assert.ok(ready.length >= 17);
  for (const l of ready) {
    assert.ok(l.tasks.length >= 5 && l.tasks.length <= 10, l.key);
    assert.match(l.theoryMd, /^# /, l.key);
    for (const t of l.tasks) {
      assert.ok(t.tests.length >= 1 && t.openTests >= 1, t.id);
      assert.doesNotMatch(t.statement, /```/, `${t.id}: в условии нет кода`);
    }
  }
  const texts = course.LESSONS.flatMap((l) => [l.title, l.theoryMd, ...l.tasks.flatMap((t) => [t.title, t.statement])]).join('\n');
  assert.doesNotMatch(texts, /лёгк(ий|ая|ое) (уров|задач)|средн(ий|яя|его) уровн|сложн(ый|ая) уровн|уровень сложности/i);
});

test('every reference solution passes all tests (CPython) and follows the task rules', () => {
  const proc = spawnSync(process.env.IB_PYTHON || 'python3', [path.join(ROOT, 'scripts', 'python-course', 'check.py'), '--all'], { encoding: 'utf-8' });
  assert.strictEqual(proc.status, 0, proc.stderr);
  const result = JSON.parse(proc.stdout);
  assert.strictEqual(result.checked, course.TASK_BY_ID.size);
  assert.deepStrictEqual(result.failed, []);
  for (const task of course.TASK_BY_ID.values()) {
    const rules = course.codeRules(solution(task.id), task);
    assert.deepStrictEqual([rules.syntax, rules.found, rules.missing], [null, [], []], task.id);
  }
});

test('the theory does not contain a reference solution line', () => {
  for (const l of course.LESSONS.filter((x) => x.ready)) {
    const theory = l.theoryMd;
    for (const t of l.tasks) {
      // Заголовки блоков («except ValueError:»), импорты и чтение ввода (приём из теории) — общий синтаксис, не решение.
      const lines = solution(t.id).split('\n').map((s) => s.trim())
        .filter((s) => s.length >= 24 && !s.endsWith(':') && !/^(import|from) /.test(s) && !s.includes('input()'))
        // Подключение к базе и таблицы, которые описаны в условии задачи, — тоже обвязка.
        .filter((s) => !/sqlite3\.connect\(|CREATE TABLE|PRAGMA|row_factory/.test(s));
      for (const line of lines) {
        assert.ok(!theory.includes(line), `${t.id}: «${line}» есть в теории урока ${l.key}`);
      }
    }
  }
});

test('code rules: a forbidden built-in or a missing construct is found', () => {
  const task = course.TASK_BY_ID.get('cond-03');
  assert.deepStrictEqual(course.codeRules('a=1\nprint(max(a, 2))', task).found, ['max() (строка 2)']);
  const loop = course.TASK_BY_ID.get('while-03');
  assert.deepStrictEqual(course.codeRules('import math\nprint(math.gcd(4, 6))', loop).found, ['модуль math (строка 1)']);
  assert.deepStrictEqual(course.codeRules('print(1)', loop).missing, ['цикл while']);
});

test('only TEST sees the course: Python page block, course pages and API', async () => {
  const app = createApp();
  const ib = await loginAs(app, 'ib-1');
  assert.strictEqual((await ib.get(BASE)).status, 404);
  assert.doesNotMatch((await ib.get('/subjects/python')).text, /Открыть курс/);
  const tester = await loginAs(app, 'test-1');
  // Курс — основное содержимое предмета: модули и уроки прямо на странице Python, /course ведёт туда же.
  const page = await tester.get('/subjects/python');
  assert.match(page.text, /Курс «Начальный Python»/);
  assert.match(page.text, /Модуль 1\. Введение в Python и алгоритмы/);
  assert.match(page.text, new RegExp(`href="${BASE}/intro/theory"`));
  assert.strictEqual((await tester.get(BASE)).headers.location, '/subjects/python#course');
  assert.match((await tester.get('/')).text, /Курс «Начальный Python»/);
  const theory = await tester.get(`${BASE}/intro/theory`);
  assert.strictEqual(theory.status, 200);
  assert.match(theory.text, /python-course-theory\.js/);
  const practice = await tester.get(`${BASE}/intro/practice`);
  assert.strictEqual(practice.status, 302);
  const taskPage = await tester.get(practice.headers.location);
  assert.strictEqual(taskPage.status, 200);
  assert.match(taskPage.text, /\/js\/python-course\.js/);
  assert.strictEqual((await tester.get(`${BASE}/no-such-lesson/theory`)).status, 404);
});

test('Python assignments sit inside their lessons; dict assignments and the bank became lesson tasks', async () => {
  const { seedAssignment, cleanupContentFiles } = require('../helpers/fixtures');
  const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/python-course/assignments.json'), 'utf-8')).rules;
  for (const r of rules) assert.ok(course.LESSON_BY_KEY.has(r.lesson), `урок ${r.lesson} из assignments.json не найден`);
  assert.strictEqual(course.lessonForAssignment('individual/st-x/svoi-modul-dlya-raboty-s-bazoi-dannyh.md'), 'sqlite-1');
  assert.strictEqual(course.lessonForAssignment('section-dom-rabota-s-document/a.md'), null);
  // Задания «Объекты и словари» и банк переделаны в задачи практики уроков (pyd-*, pyb-*).
  const ids = new Set(course.LESSONS.flatMap((l) => (l.tasks || []).map((t) => t.id)));
  for (const r of rules) for (const id of r.replacedBy || []) assert.ok(ids.has(id), `задачи ${id} нет в курсе`);
  for (const ex of db.getLanguageExercises('python')) {
    const id = `pyb-${String(Number(ex.id.split('-').pop()) + 1).padStart(2, '0')}`;
    assert.ok(ids.has(id), `задача банка ${ex.id} не перенесена в курс (${id})`);
  }
  for (const id of ids) {
    if (/^py[bd]-/.test(id)) assert.match(course.LESSONS.flatMap((l) => l.tasks || []).find((t) => t.id === id).statement, /Решение — на Python/);
  }
  try {
    const dict = seedAssignment({ title: 'Счётчик повторов', mdPath: 'section-obekty-i-slovari/zadacha-1-schetchik-povtorov.md' });
    const dom = seedAssignment({ title: 'Про DOM', mdPath: 'section-dom-rabota-s-document/teoriya-dom-i-obekt-document.md' });
    const own = seedAssignment({ title: 'Свой модуль', mdPath: 'individual/st-ib-218/svoi-modul-dlya-raboty-s-bazoi-dannyh.md', targetType: 'individual', targetStudentId: 'test-1' });
    const tester = await loginAs(createApp(), 'test-1');
    const page = await tester.get('/subjects/python');
    const main = page.text.slice(page.text.indexOf('<main'));
    // Личное задание по SQLite стоит в карточке урока 5.2; отдельных разделов «Задания со сдачей» и «Банк» нет;
    // «Объекты и словари» (стали задачами pyd-*) и DOM в Python с курсом не показываются.
    const lesson = main.slice(main.indexOf(`href="${BASE}/sqlite-1/theory"`));
    assert.match(lesson.slice(0, 3000), new RegExp(`/assignment/${own.id}\\?subject=python`));
    assert.doesNotMatch(main, /id="assignments"|id="bank"/);
    assert.doesNotMatch(page.text, new RegExp(`/assignment/(${dom.id}|${dict.id})`));
    const sidebar = page.text.slice(page.text.indexOf('id="sidebar"'), page.text.indexOf('<main'));
    assert.match(sidebar, /Сдать: Свой модуль для работы с базой данных/);
    assert.doesNotMatch(sidebar, /Банк задач/);
  } finally {
    cleanupContentFiles();
  }
});

test('lessons open in order: practice after the theory, the next lesson after all its tasks', () => {
  course.PYTHON_COURSE_GROUPS.push('IB');
  try {
    const user = { id: 'ib-1', role: 'student', group: 'IB', name: 'Иб Студент' };
    let [intro, algo] = course.lessonsForStudent(user);
    assert.deepStrictEqual([intro.theoryOpen, intro.practiceOpen, algo.theoryOpen], [true, false, false]);
    course.markTheoryRead(user, 'intro');
    [intro] = course.lessonsForStudent(user);
    assert.strictEqual(intro.practiceOpen, true);
    for (const task of course.LESSON_BY_KEY.get('intro').tasks) {
      course.checkTask(user, task, { code: solution(task.id), runs: runsFor(task) });
    }
    [intro, algo] = course.lessonsForStudent(user);
    assert.strictEqual(intro.done, true);
    assert.deepStrictEqual([algo.theoryOpen, algo.practiceOpen], [true, false]);
  } finally {
    course.PYTHON_COURSE_GROUPS.splice(course.PYTHON_COURSE_GROUPS.indexOf('IB'), 1);
  }
});

test('check API: outputs compared on the server, rules applied, draft and events saved', async () => {
  const tester = await loginAs(createApp(), 'test-1');
  const task = course.TASK_BY_ID.get('cond-03');
  const url = `${BASE}/conditions/cond-03`;
  let res = await tester.post(`${url}/check`).send({ code: solution('cond-03'), runs: runsFor(task, true) });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.solved, false);
  assert.strictEqual(res.body.passed, task.tests.length - 1);
  assert.strictEqual(res.body.tests.at(-1).expected, undefined, 'a closed test does not show its output');
  res = await tester.post(`${url}/check`).send({ code: 'a = int(input())\nprint(max(a, 1))', runs: runsFor(task) });
  assert.strictEqual(res.body.passed, task.tests.length);
  assert.strictEqual(res.body.solved, false, 'all tests pass, but max() is forbidden');
  assert.deepStrictEqual(res.body.forbidden, ['max() (строка 2)']);
  res = await tester.post(`${url}/check`).send({ code: solution('cond-03'), runs: runsFor(task) });
  assert.strictEqual(res.body.solved, true);
  assert.strictEqual((await tester.post(`${url}/check`).send({ code: 'x', runs: [] })).status, 400);
  await tester.post(`${url}/draft`).send({ code: '# черновик' });
  await tester.post(`${url}/event`).send({ type: 'paste' });
  await tester.post(`${url}/event`).send({ type: 'away', ms: 30000 });
  const item = course.progressMap('test-1').get('cond-03');
  assert.strictEqual(item.draft, '# черновик');
  assert.deepStrictEqual([item.stats.attempts, item.stats.pastes, item.stats.aways], [3, 1, 1]);
  assert.ok(item.solvedAt);
  assert.strictEqual(db.getPythonCourseAttempts('test-1', 'cond-03').length, 3);
  assert.strictEqual((await tester.post(`${BASE}/intro/cond-03/check`).send({ code: '', runs: [] })).status, 404, 'a task of another lesson');
});

test('admin pages: matrix, student card with code, reset', async () => {
  const app = createApp();
  const tester = await loginAs(app, 'test-1');
  const task = course.TASK_BY_ID.get('intro-03');
  await tester.post(`${BASE}/intro/intro-03/check`).send({ code: solution('intro-03'), runs: runsFor(task) });
  const teacher = await loginAs(app, 'teacher-1');
  const matrix = await teacher.get('/admin/python-course');
  assert.strictEqual(matrix.status, 200);
  assert.match(matrix.text, /Тест Студент/);
  assert.doesNotMatch(matrix.text, /Иб Студент/);
  const card = await teacher.get('/admin/python-course/students/test-1');
  assert.strictEqual(card.status, 200);
  assert.match(card.text, /Последние проверки/);
  await teacher.post('/admin/python-course/students/test-1/reset');
  assert.strictEqual(db.getPythonCourseProgress('test-1').length, 0);
  assert.strictEqual((await tester.get('/admin/python-course')).status, 403);
});
