// Предмет «Цвет и палитра» (src/lib/palette-course): содержание, доступ, порядок, проверка по правилам теории
// цвета (через движок каскада + color-engine), решаемость эталонов, реестр блокировок и админка.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const course = require('../../src/lib/palette-course');
const subjectTopics = require('../../src/lib/subject-topics');

const ROOT = path.join(__dirname, '..', '..');
const BASE = course.SUBJECT_BASE;

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'test-1', role: 'student', name: 'Тест Студент', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'w1-1', role: 'student', name: 'Веб-1 Студент', group: 'web-1', mustChangePassword: false });
  db.createUser({ id: 'w2-1', role: 'student', name: 'Веб Студент', group: 'web-2', mustChangePassword: false });
  db.createUser({ id: 'teach-p', role: 'teacher', name: 'Преподаватель', mustChangePassword: false });
});

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

const goodCardRead = '.product-card{background:#ffffff}.product-card__title{color:#2a2a2e}.product-card__desc{color:#4e4e54}';

test('темы заданы; у готовой темы — теория и задачи с ролями, правилами и шаблоном', () => {
  assert.ok(course.TOPICS.length >= 1);
  const ready = course.TOPICS.filter((t) => t.ready);
  assert.ok(ready.length >= 1);
  for (const t of ready) {
    assert.match(t.theoryMd, /^# /, t.key);
    assert.ok(t.tasks.length >= 1, t.key);
    for (const task of t.tasks) {
      assert.ok(task.roles.length >= 1 && task.rules.length >= 1, task.id);
      assert.ok(task.template, task.id);
      assert.ok(task.sample, `${task.id}: нужна эталонная палитра`);
    }
  }
});

test('нет слов про уровни сложности', () => {
  const texts = course.TOPICS.flatMap((t) => [t.title, t.lead, t.theoryMd, ...t.tasks.flatMap((x) => [x.title, x.prompt])]).join('\n');
  assert.doesNotMatch(texts, /лёгк(ий|ая|ое) (уров|задач)|средн(ий|яя|его) уровн|сложн(ый|ая) уровн|уровень сложности/i);
});

test('каждый эталон проходит все правила, пустой CSS — нет', () => {
  const proc = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'palette-course', 'check.js')],
    { encoding: 'utf-8', env: { ...process.env, DB_PATH: ':memory:' } });
  assert.strictEqual(proc.status, 0, proc.stdout + proc.stderr);
});

test('доступ: TEST и web-1 видят предмет, прочие группы — 404', async () => {
  const app = createApp();
  const test1 = await loginAs(app, 'test-1');
  assert.strictEqual((await test1.get(BASE)).status, 200);
  const w1 = await loginAs(app, 'w1-1');
  assert.strictEqual((await w1.get(BASE)).status, 200);
  // web-1 — не TEST: практика открывается только после теории первой темы
  assert.strictEqual((await w1.get(`${BASE}/contrast/card-read`)).status, 302);
  assert.strictEqual((await w1.get(`${BASE}/contrast/theory`)).status, 200);
  assert.strictEqual((await w1.get(`${BASE}/contrast/card-read`)).status, 200);
  const w2 = await loginAs(app, 'w2-1');
  assert.strictEqual((await w2.get(BASE)).status, 404);
});

test('страницы темы: обзор, теория, практика (редирект на задачу), задача', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'test-1');
  assert.strictEqual((await agent.get(BASE)).status, 200);
  assert.strictEqual((await agent.get(`${BASE}/contrast/theory`)).status, 200);
  const practice = await agent.get(`${BASE}/contrast/practice`);
  assert.strictEqual(practice.status, 302);
  assert.match(practice.headers.location, /\/subjects\/palette\/contrast\/card-read$/);
  assert.strictEqual((await agent.get(`${BASE}/contrast/card-read`)).status, 200);
});

test('проверка: подходящая палитра решает задачу, нечитаемая — нет', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'test-1');
  const ok = await agent.post(`${BASE}/contrast/card-read/check`).send({ code: goodCardRead });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.success, true);
  const bad = await agent.post(`${BASE}/contrast/card-read/check`).send({ code: '.product-card{background:#fff}.product-card__title{color:#eee}.product-card__desc{color:#eee}' });
  assert.strictEqual(bad.body.success, false);
  assert.ok(bad.body.checks.some((c) => !c.ok));
});

test('страница задачи не содержит ссылок на внешние хосты', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'test-1');
  const html = (await agent.get(`${BASE}/contrast/card-read`)).text;
  assert.doesNotMatch(html, /https?:\/\/(?!localhost)/);
});

test('предмет подключён к реестру блокировок тем (/admin/locks)', () => {
  const reg = subjectTopics.get('palette');
  assert.ok(reg && reg.topics.length >= 1);
  assert.strictEqual(reg.key, 'palette');
});

test('админка: матрица, карточка студента и сброс прогресса', async () => {
  const app = createApp();
  const student = await loginAs(app, 'test-1');
  await student.post(`${BASE}/contrast/card-read/check`).send({ code: goodCardRead });

  const teacher = await loginAs(app, 'teach-p');
  const matrix = await teacher.get('/admin/palette');
  assert.strictEqual(matrix.status, 200);
  assert.match(matrix.text, /Тест Студент/);
  const card = await teacher.get('/admin/palette/students/test-1');
  assert.strictEqual(card.status, 200);
  assert.match(card.text, /Контраст и читаемость/);

  const reset = await teacher.post('/admin/palette/students/test-1/reset');
  assert.strictEqual(reset.status, 302);
  const after = course.topicFor({ id: 'test-1', role: 'student', group: 'TEST' }, 'contrast');
  assert.strictEqual(after.solved, 0);
});
