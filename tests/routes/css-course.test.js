// Предмет «Web-разработка: CSS» (src/lib/css-course): содержание, доступ, порядок тем, API практики, правила, админка.
// Сравнение вида проверяется в браузере скриптом scripts/css-course/verify.js (эталон проходит, пустой CSS — нет).
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const course = require('../../src/lib/css-course');
const { renderTheory, splitExample } = require('../../src/lib/css-course/theory');

const BASE = '/subjects/css';

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'test-1', role: 'student', name: 'Тест Студент', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'w1-1', role: 'student', name: 'Студент web-1', group: 'web-1', mustChangePassword: false });
  db.createUser({ id: 'w2-1', role: 'student', name: 'Студент web-2', group: 'web-2', mustChangePassword: false });
  db.createUser({ id: 'teacher-x', role: 'teacher', name: 'Преподаватель', mustChangePassword: false });
});

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

const BIG = new Set(['flex-container', 'flex-items', 'grid', 'grid-areas', 'motion', 'responsive']);

test('19 topics, all written: theory with live examples; 15–20 tasks in flexbox/grid/motion/responsive, 8–10 elsewhere', () => {
  assert.strictEqual(course.TOPICS.length, 19);
  const ids = new Set();
  for (const t of course.TOPICS) {
    assert.ok(t.ready, t.key);
    const [min, max] = BIG.has(t.key) ? [15, 20] : [8, 10];
    assert.ok(t.tasks.length >= min && t.tasks.length <= max, `${t.key}: ${t.tasks.length} заданий`);
    assert.ok((t.theoryMd.match(/```example/g) || []).length >= 2, `${t.key}: живые примеры в теории`);
    for (const task of t.tasks) {
      assert.ok(!ids.has(task.id), `повтор id ${task.id}`);
      ids.add(task.id);
      assert.ok(task.title && task.description && task.html && task.css, task.id);
      assert.ok(task.widths.every((w) => Number.isInteger(w) && w >= 320 && w <= 1440), task.id);
      assert.strictEqual(course.checkRules(task.css, task), null, `${task.id}: эталон нарушает свои правила`);
    }
  }
  const texts = course.TOPICS.flatMap((t) => [t.title, t.lead, t.theoryMd, ...t.tasks.flatMap((x) => [x.title, x.description])]).join('\n');
  assert.doesNotMatch(texts, /лёгк|легк|средн(ий|яя|его) уровн|сложн(ый|ая) уровн|уровень сложности/i, 'no difficulty levels');
  assert.ok(course.TOPICS.find((t) => t.key === 'responsive').tasks.every((x) => x.widths.length === 3), 'адаптивные — на трёх ширинах');
});

test('the theory does not contain a task reference CSS; examples render CSS and HTML', () => {
  const squash = (s) => s.replace(/\s+/g, '');
  for (const t of course.TOPICS) {
    const theory = squash(t.theoryMd);
    for (const task of t.tasks) assert.ok(!theory.includes(squash(task.css)), `${task.id}: эталон есть в теории`);
  }
  assert.deepStrictEqual(splitExample('p { color: red; }\n---\n<p>Текст</p>\n'), { css: 'p { color: red; }', html: '<p>Текст</p>' });
  const html = renderTheory('# Тема\n\n```example Подпись\np { color: red; }\n---\n<p>Текст</p>\n```\n');
  assert.match(html, /class="css-example"/);
  assert.match(html, /data-css="p \{ color: red; \}"/);
  assert.match(html, /data-html="&lt;p&gt;Текст&lt;\/p&gt;"/);
  assert.match(html, /Подпись/);
});

test('rules: property with value, property, bare word, unit, at-rule; comments and case ignored', () => {
  const rules = (css, require = [], forbid = []) => course.checkRules(css, { require, forbid });
  assert.strictEqual(rules('.a { DISPLAY: Flex; }', ['display: flex']), null);
  assert.match(rules('.a { display: grid; }', ['display: flex']), /обязательно «display: flex»/);
  assert.match(rules('/* display: flex */ .a { display: block; }', ['display: flex']), /обязательно/);
  assert.strictEqual(rules('.a { font: inherit; }', ['inherit']), null);
  assert.strictEqual(rules('.a { font-size: 0.75em; }', ['em']), null);
  assert.match(rules('.a { font-size: 2rem; }', ['em']), /обязательно «em»/);
  assert.strictEqual(rules('@media (max-width: 600px) { .a { color: red; } }', ['@media']), null);
  assert.match(rules('.a { color: red !important; }', [], ['!important']), /нельзя/);
});

test('who sees the subject: TEST, web-1 and web-2 (home card, pages, API); other groups do not', async () => {
  db.createUser({ id: 'ib-1', role: 'student', name: 'Студент ib-2', group: 'ib-2', mustChangePassword: false });
  const app = createApp();
  const ib = await loginAs(app, 'ib-1');
  assert.strictEqual((await ib.get(BASE)).status, 404);
  assert.strictEqual((await ib.get(`${BASE}/api/connect/me`)).status, 404);
  assert.doesNotMatch((await ib.get('/')).text, /href="\/subjects\/css"/);
  for (const id of ['test-1', 'w1-1', 'w2-1']) {
    const agent = await loginAs(app, id);
    const home = (await agent.get('/')).text;
    assert.match(home, /href="\/subjects\/css"/, id);
    assert.match(home, /href="\/subjects\/html"/, id);
    const page = await agent.get(BASE);
    assert.strictEqual(page.status, 200);
    assert.match(page.text, /Тема 1\. Как CSS подключается к странице/);
    assert.match(page.text, /topic-btn topic-btn-theory/);
    assert.strictEqual((await agent.get('/subjects/html')).status, 200, id);
  }
  // web-2 не изучает Python: карточки нет, страницы предмета — 404; JavaScript и остальные — как были.
  const w2 = await loginAs(app, 'w2-1');
  const home = (await w2.get('/')).text;
  assert.doesNotMatch(home, /href="\/subjects\/python"/);
  assert.match(home, /href="\/subjects\/javascript"/);
  assert.strictEqual((await w2.get('/subjects/python')).status, 404);
  assert.strictEqual((await w2.get('/subjects/python/bank/python-variables-0')).status, 404);
  assert.match((await ib.get('/')).text, /href="\/subjects\/python"/);
});

test('topics open in order: practice after the theory, the next topic after all its tasks (TEST: all open)', async () => {
  const app = createApp();
  const w1 = await loginAs(app, 'w1-1');
  assert.strictEqual((await w1.get(`${BASE}/connect/practice`)).headers.location, BASE);
  assert.strictEqual((await w1.get(`${BASE}/selectors/theory`)).headers.location, BASE);
  const theory = await w1.get(`${BASE}/connect/theory`);
  assert.strictEqual(theory.status, 200);
  assert.match(theory.text, /\/js\/css-examples\.js/);
  const practice = await w1.get(`${BASE}/connect/practice`);
  assert.strictEqual(practice.status, 200);
  assert.match(practice.text, /\/js\/css-check\.js/);
  assert.match(practice.text, /mode\/css\/css\.min\.js/);
  for (const task of course.TOPIC_BY_KEY.get('connect').tasks) {
    await w1.post(`${BASE}/api/connect/events`).send({ type: 'attempt', exerciseId: task.id, status: 'success', code: task.css });
  }
  assert.strictEqual((await w1.get(`${BASE}/selectors/theory`)).status, 200);
  assert.strictEqual((await w1.get(`${BASE}/no-such-topic/theory`)).status, 404);
  const tester = await loginAs(app, 'test-1');
  assert.strictEqual((await tester.get(`${BASE}/final/practice`)).status, 200);
});

test('API: tasks with markup and encoded reference; attempts — browser verdict + server rules; paste and away', async () => {
  const app = createApp();
  const t = await loginAs(app, 'test-1');
  const me = (await t.get(`${BASE}/api/flex-container/me`)).body;
  assert.strictEqual(me.tasks.length, 16);
  const first = me.tasks[0];
  assert.ok(first.html.includes('class="buttons"'));
  assert.strictEqual(first.css, undefined, 'эталон не отдаётся открытым текстом');
  assert.strictEqual(Buffer.from(first.ref, 'base64').toString('utf-8'), course.TASK_BY_ID.get(first.id).css);
  assert.deepStrictEqual(first.require, ['display: flex']);

  const post = (body) => t.post(`${BASE}/api/flex-container/events`).send(body);
  // Вид совпал, но без flex — правило задания не выполнено.
  const rules = await post({ type: 'attempt', exerciseId: 'flexc-01', status: 'success', code: '.buttons { display: grid; grid-auto-flow: column; justify-content: start; }' });
  assert.strictEqual(rules.body.status, 'rules');
  assert.match(rules.body.message, /display: flex/);
  assert.strictEqual((await post({ type: 'attempt', exerciseId: 'flexc-01', status: 'mismatch', code: '' })).body.status, 'mismatch');
  assert.strictEqual((await post({ type: 'attempt', exerciseId: 'flexc-01', status: 'success', code: '.buttons { display: flex; }' })).body.status, 'success');
  assert.strictEqual((await post({ type: 'paste', exerciseId: 'flexc-01', kind: 'paste' })).status, 200);
  assert.strictEqual((await post({ type: 'away', exerciseId: 'flexc-01', ms: 20000 })).status, 200);
  assert.strictEqual((await post({ type: 'attempt', exerciseId: 'no-such', status: 'success', code: '' })).status, 400);

  const stats = course.progressMap('test-1').get('flexc-01');
  assert.ok(stats.solvedAt);
  assert.strictEqual(stats.attemptsToSolve, 3);
  assert.strictEqual(stats.rules, 1);
  assert.strictEqual(stats.pastes, 1);
  const again = (await t.get(`${BASE}/api/flex-container/me`)).body;
  assert.deepStrictEqual(again.progress.solved, ['flexc-01']);
  assert.strictEqual(again.progress.drafts['flexc-01'], '.buttons { display: flex; }');
});

test('admin: matrix, student card with CSS and log, reset', async () => {
  const app = createApp();
  const t = await loginAs(app, 'test-1');
  await t.post(`${BASE}/api/connect/events`).send({ type: 'attempt', exerciseId: 'connect-01', status: 'success', code: 'h1 { color: #CA2851; }' });
  const teacher = await loginAs(app, 'teacher-x');
  const matrix = await teacher.get('/admin/css');
  assert.strictEqual(matrix.status, 200);
  assert.match(matrix.text, /Студент web-1/);
  const card = await teacher.get('/admin/css/students/test-1');
  assert.strictEqual(card.status, 200);
  assert.match(card.text, /h1 \{ color: #CA2851; \}/);
  await teacher.post('/admin/css/students/test-1/reset');
  assert.strictEqual(course.progressMap('test-1').size, 0);
});

test('server recheck: a faked «success» with the wrong CSS is not counted; typing flags are recorded', async () => {
  const app = createApp();
  const t = await loginAs(app, 'test-1');
  const post = (body) => t.post(`${BASE}/api/connect/events`).send(body);
  // браузер «сказал» success, но цвет другой — сервер не засчитывает
  const fake = await post({ type: 'attempt', exerciseId: 'connect-01', status: 'success', code: 'h1 { color: blue; }' });
  assert.strictEqual(fake.body.status, 'server');
  assert.match(fake.body.hints[0], /цвет текста/);
  assert.ok(!course.progressMap('test-1').get('connect-01').solvedAt);
  // равнозначная запись засчитывается
  assert.strictEqual((await post({ type: 'attempt', exerciseId: 'connect-01', status: 'success', code: 'h1 { color: rgb(202, 40, 81); }' })).body.status, 'success');
  // копия эталона и готовый кусок — сигналы, решение засчитывается
  const ref = course.TASK_BY_ID.get('connect-10').css;
  const typed = { final: ref.length, restored: 0, typed: 5, emmet: 0, auto: 0, other: ref.length, deletes: 0, undos: 0, bigInserts: 1, biggest: ref.length, keys: 3, meanMs: 100, cv: 0.5, activeMs: 2000 };
  const copied = await post({ type: 'attempt', exerciseId: 'connect-10', status: 'success', code: ref, typing: typed });
  assert.strictEqual(copied.body.status, 'success');
  const stats = course.progressMap('test-1').get('connect-10');
  assert.deepStrictEqual(stats.typing, { refCopy: 1, chunk: 1, untyped: 1 });
  const teacher = await loginAs(app, 'teacher-x');
  const page = await teacher.get('/admin/css?pick=1');
  assert.match(page.text, /код не руками: копия эталона, готовый кусок кода, кода больше, чем набрано/);
  assert.match(page.text, /На устную проверку/);
  assert.match((await teacher.get('/admin/css/students/test-1')).text, /копия эталона/);
});

