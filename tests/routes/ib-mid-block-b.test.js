const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const blockB = require('../../src/lib/ib-mid/block-b');

const app = createApp();
const DAY = 86400000;

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'st-ib', role: 'student', name: 'Ибрагим', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'st-tst', role: 'student', name: 'Тест', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'st-web', role: 'student', name: 'Веб', group: 'web-1', mustChangePassword: false });
});

async function login(id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('блок B готов и ведёт на страницу задачи', async () => {
  const a = await login('st-tst');
  const page = await a.get('/exam/ib-mid-1');
  assert.match(page.text, /Отчёт по продажам/);
  assert.match(page.text, /\/exam\/ib-mid-1\/b1-sales/);
  assert.doesNotMatch(page.text, /Отчёт по продажам[\s\S]{0,120}Готовится/);
});

test('страница задачи B1: редактор и данные (без готового кода)', async () => {
  const a = await login('st-tst');
  const r = await a.get('/exam/ib-mid-1/b1-sales');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /Редактор Python/);
  assert.match(r.text, /ib-mid-python\.js/);
  assert.match(r.text, /data-datasets=/);
  assert.match(r.text, /CREATE TABLE sales/);
});

test('проверка правильного вывода засчитывает задачу (status done)', async () => {
  const a = await login('st-tst');
  const d = blockB.datasetsFor('st-tst', 'b1-sales');
  const r = await a.post('/exam/ib-mid-1/b1-sales/check').send({ outputs: d.expected });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.solved, true);
  assert.strictEqual(db.getMidTask('st-tst', 'b1-sales').status, 'done');
  // неверный вывод
  const bad = await a.post('/exam/ib-mid-1/b2-logins/check').send({ outputs: ['x', 'y'] });
  assert.strictEqual(bad.body.solved, false);
  assert.ok(bad.body.hint);
});

test('автосохранение черновика', async () => {
  const a = await login('st-tst');
  await a.post('/exam/ib-mid-1/b1-sales/draft').send({ draft: 'print(1)' });
  assert.strictEqual(db.getMidTask('st-tst', 'b1-sales').draft, 'print(1)');
});

test('вне окна (ib-2) закрыто, чужой группе 404', async () => {
  const ib = await login('st-ib');
  assert.strictEqual((await ib.get('/exam/ib-mid-1/b1-sales')).status, 302); // нет окна → редирект
  assert.strictEqual((await ib.post('/exam/ib-mid-1/b1-sales/check').send({ outputs: [] })).status, 423);
  db.setMidWindow(new Date(Date.now() - DAY).toISOString(), new Date(Date.now() + DAY).toISOString());
  assert.strictEqual((await ib.get('/exam/ib-mid-1/b1-sales')).status, 200);
  const web = await login('st-web');
  assert.strictEqual((await web.get('/exam/ib-mid-1/b1-sales')).status, 404);
});
