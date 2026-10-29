// Курс «JavaScript: от синтаксиса до DOM» (src/lib/js-course): содержание, эталоны, правила кода, запуск, доступ,
// порядок уроков, проверка решения и админка.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const course = require('../../src/lib/js-course');
const { checkRules } = require('../../src/lib/js-course/rules');
const { run } = require('../../public/js/js-runner.js');

const ROOT = path.join(__dirname, '..', '..');
const BASE = course.COURSE_BASE;
const solution = (id) => fs.readFileSync(path.join(ROOT, 'scripts', 'js-course', 'solutions', `${id}.js`), 'utf-8');
const tick = () => new Promise((r) => setImmediate(r));

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'test-1', role: 'student', name: 'Тест Студент', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'w2-1', role: 'student', name: 'Веб Студент', group: 'web-2', mustChangePassword: false });
  db.createUser({ id: 'other-1', role: 'student', name: 'Другой Студент', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'teach-j', role: 'teacher', name: 'Преподаватель', mustChangePassword: false });
});

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

const runsFor = (task, wrong = false) => task.tests.map((t, i) => ({ stdout: wrong && i === task.tests.length - 1 ? 'не то' : t.output, error: null, timeout: false }));

test('6 modules, 46 lessons; written lessons have theory with runnable examples and 6–12 tasks', () => {
  assert.strictEqual(course.MODULES.length, 6);
  assert.strictEqual(course.LESSONS.length, 46);
  const ready = course.LESSONS.filter((l) => l.ready);
  assert.ok(ready.length >= 34);
  for (const l of ready) {
    assert.ok(l.tasks.length >= 6 && l.tasks.length <= 12, `${l.key}: ${l.tasks.length}`);
    assert.match(l.theoryMd, /^# /, l.key);
    assert.match(l.theoryMd, /```js run/, `${l.key}: в теории есть запускаемый пример`);
    for (const t of l.tasks) {
      assert.ok(t.tests.length >= 1 && t.openTests >= 1, t.id);
      assert.doesNotMatch(t.statement, /```/, `${t.id}: в условии нет кода`);
    }
  }
  const texts = course.LESSONS.flatMap((l) => [l.title, l.theoryMd, ...l.tasks.flatMap((t) => [t.title, t.statement])]).join('\n');
  assert.doesNotMatch(texts, /лёгк(ий|ая|ое) (уров|задач)|средн(ий|яя|его) уровн|сложн(ый|ая) уровн|уровень сложности/i);
});

test('the JS bank and «Объекты и словари» became lesson tasks (jsb-01…12, jsd-01…15)', () => {
  for (let i = 1; i <= 12; i++) assert.ok(course.TASK_BY_ID.has(`jsb-${String(i).padStart(2, '0')}`), `jsb-${i}`);
  for (let i = 1; i <= 15; i++) assert.ok(course.TASK_BY_ID.has(`jsd-${String(i).padStart(2, '0')}`), `jsd-${i}`);
  assert.ok(course.replacedByCourse('section-obekty-i-slovari/zadacha-1-schetchik-povtorov.md'));
  assert.ok(!course.replacedByCourse('section-dom-rabota-s-document/zadacha-1-privetstvie.md'));
});

test('every reference solution passes all tests and follows the task rules', () => {
  const proc = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'js-course', 'check.js')], { encoding: 'utf-8' });
  assert.strictEqual(proc.status, 0, proc.stdout + proc.stderr);
  const result = JSON.parse(proc.stdout);
  assert.strictEqual(result.checked, course.TASK_BY_ID.size);
  assert.deepStrictEqual(result.failed, []);
});

test('the theory does not contain a reference solution line', () => {
  for (const l of course.LESSONS.filter((x) => x.ready)) {
    for (const t of l.tasks) {
      const lines = solution(t.id).split('\n').map((s) => s.trim()).filter((s) => s.length >= 24 && !s.includes('input()'));
      for (const line of lines) assert.ok(!l.theoryMd.includes(line), `${t.id}: «${line}» есть в теории урока ${l.key}`);
    }
  }
});

test('code rules: methods, members, constructs, functions, recursion; strings and comments ignored', () => {
  assert.deepStrictEqual(checkRules("const a = [3, 1].sort(); // .sort()\nconsole.log('Math.max(1)')", { forbid: ['.sort', 'Math.max'] }).found, ['.sort']);
  assert.deepStrictEqual(checkRules('function f(n) { return n < 2 ? 1 : n * f(n - 1); }', { require: ['recursion', 'def:f'] }).missing, []);
  assert.deepStrictEqual(checkRules('const g = (n) => n + 1;', { require: ['recursion', 'for'] }).missing, ['recursion', 'for']);
  assert.deepStrictEqual(checkRules('const s = `x ${[1].map((v) => v)}`;', { require: ['template', '=>'] }).missing, []);
  assert.match(checkRules('let x = ;', {}).syntax, /SyntaxError/);
  assert.deepStrictEqual(checkRules('const c = u.address?.city ?? 0; const p = 2**3;', { require: ['?.', '??', '**'] }).missing, []);
  const destr = (code) => checkRules(code, { require: ['destructuring'] }).missing.length === 0;
  assert.ok(destr('let a = 1, b = 2;\n[a, b] = [b, a];') && destr('function f({ x }) {}') && destr('const g = ({ x }) => x;'));
  assert.ok(!destr('const a = [1, 2];\nif (a[0] === 1) a[1] = 3;'));
});

test('runner: input, formatting, virtual timers, fetch to the training API, errors', async () => {
  const r1 = await run("const n = Number(input()); console.log(n * 2, [1, 'a', { b: [2] }], new Map([[1, 2]]), new Set([3]))", ['21'], { tick });
  assert.strictEqual(r1.stdout, "42 [ 1, 'a', { b: [ 2 ] } ] Map(1) { 1 => 2 } Set(1) { 3 }");
  const r2 = await run("setTimeout(() => console.log('B'), 100); console.log('A'); await new Promise((r) => setTimeout(r, 50)); console.log('C');", [], { tick });
  assert.strictEqual(r2.stdout, 'A\nC\nB');
  const r3 = await run("const r = await fetch('http://api.edu/weather?city=Бухара'); console.log(r.status, (await r.json()).temp);", [], { tick });
  assert.strictEqual(r3.stdout, '200 27');
  assert.match((await run('input(); input()', ['1'], { tick })).error, /строки ввода закончились/);
  assert.match((await run('setInterval(() => {}, 1)', [], { tick })).error, /setInterval/);
});

test('web-2 and TEST see the course with modules; a group without the course keeps the old JavaScript subject', async () => {
  const app = createApp();
  // Группа ib-2 курс не видит — у неё остаётся старый предмет JavaScript (задания), а уроков курса нет.
  const other = await loginAs(app, 'other-1');
  assert.strictEqual((await other.get(`${BASE}/intro/theory`)).status, 404);
  assert.doesNotMatch((await other.get('/subjects/javascript')).text, /Модуль 1\. Основы языка/);
  // web-2 теперь видит курс.
  const w2 = await loginAs(app, 'w2-1');
  assert.strictEqual((await w2.get(`${BASE}/intro/theory`)).status, 200);
  assert.match((await w2.get('/subjects/javascript')).text, /Модуль 1\. Основы языка/);
  const tester = await loginAs(app, 'test-1');
  const page = await tester.get('/subjects/javascript');
  assert.match(page.text, /Курс «JavaScript: от синтаксиса до DOM»/);
  assert.match(page.text, /Модуль 1\. Основы языка/);
  assert.match(page.text, new RegExp(`href="${BASE}/intro/theory"`));
  assert.strictEqual((await tester.get(BASE)).headers.location, '/subjects/javascript#course');
  assert.match((await tester.get('/')).text, /Курс «JavaScript: от синтаксиса до DOM»/);
  const theory = await tester.get(`${BASE}/intro/theory`);
  assert.match(theory.text, /\/js\/js-course-theory\.js/);
  const task = await tester.get(`${BASE}/intro/intro-04`);
  assert.strictEqual(task.status, 200);
  assert.match(task.text, /mode\/javascript\/javascript\.min\.js/);
  assert.match(task.text, /\/js\/js-course\.js/);
});

test('lessons open in order; check API compares outputs and applies the rules', async () => {
  const app = createApp();
  const w2 = await loginAs(app, 'w2-1');
  assert.strictEqual((await w2.get(`${BASE}/variables/theory`)).headers.location, BASE);
  await w2.get(`${BASE}/intro/theory`);
  const first = course.LESSON_BY_KEY.get('intro');
  for (const t of first.tasks) {
    const r = await w2.post(`${BASE}/intro/${t.id}/check`).send({ code: solution(t.id), runs: runsFor(t) });
    assert.strictEqual(r.body.solved, true, t.id);
  }
  assert.strictEqual((await w2.get(`${BASE}/variables/theory`)).status, 200);
  // неверный вывод
  const task = course.TASK_BY_ID.get('intro-04');
  const wrong = await w2.post(`${BASE}/intro/intro-04/check`).send({ code: solution('intro-04'), runs: runsFor(task, true) });
  assert.strictEqual(wrong.body.solved, false);
  // правила: Math.max запрещён в if-02
  await w2.get(`${BASE}/if/theory`);
  const tester = await loginAs(createApp(), 'test-1');
  const t2 = course.TASK_BY_ID.get('if-02');
  const ruled = await tester.post(`${BASE}/if/if-02/check`).send({ code: 'const a = Number(input()); const b = Number(input()); const c = Number(input()); if (a) console.log(Math.max(a, b, c));', runs: runsFor(t2) });
  assert.strictEqual(ruled.body.solved, false);
  assert.deepStrictEqual(ruled.body.forbidden, ['Math.max']);
  const broken = await tester.post(`${BASE}/if/if-02/check`).send({ code: 'if (', runs: runsFor(t2) });
  assert.match(broken.body.syntax, /SyntaxError/);
});

test('admin: matrix and student card with code', async () => {
  const app = createApp();
  const tester = await loginAs(app, 'test-1');
  const t = course.TASK_BY_ID.get('intro-01');
  await tester.post(`${BASE}/intro/intro-01/check`).send({ code: solution('intro-01'), runs: runsFor(t) });
  const teacher = await loginAs(app, 'teach-j');
  assert.strictEqual((await teacher.get('/admin/js-course')).status, 200);
  const card = await teacher.get('/admin/js-course/students/test-1');
  assert.strictEqual(card.status, 200);
  assert.match(card.text, /Привет, мир!/);
});
