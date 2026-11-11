const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');

const app = createApp();
const DAY = 86400000;

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'teach-a', role: 'teacher', name: 'Препод', group: null, mustChangePassword: false });
  db.createUser({ id: 'st-ib', role: 'student', name: 'Ибрагим', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'st-tst', role: 'student', name: 'Тест', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'st-web', role: 'student', name: 'Веб', group: 'web-1', mustChangePassword: false });
});

async function login(id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('блок A — готов (не «Готовится») и ведёт на терминал', async () => {
  const a = await login('st-tst'); // TEST — окно всегда открыто
  const page = await a.get('/exam/ib-mid-1');
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Единое терминальное задание/);
  assert.match(page.text, /\/exam\/ib-mid-1\/a-ops\/terminal/);
  assert.doesNotMatch(page.text, /Единое терминальное задание[\s\S]{0,200}Готовится/);
});

test('терминал блока A: TEST открывает (SECLAB_API задан)', async () => {
  const a = await login('st-tst');
  const r = await a.get('/exam/ib-mid-1/a-ops/terminal');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /SECLAB_API/);
  assert.match(r.text, /\/exam\/ib-mid-1\/a-ops\/api/);
});

test('терминал блока A закрыт вне окна (ib-2) и недоступен чужой группе', async () => {
  // ib-2 без окна — редирект на страницу контрольной
  const ib = await login('st-ib');
  const closed = await ib.get('/exam/ib-mid-1/a-ops/terminal');
  assert.strictEqual(closed.status, 302);
  assert.strictEqual(closed.headers.location, '/exam/ib-mid-1');
  const apiClosed = await ib.post('/exam/ib-mid-1/a-ops/api/whoami').send({});
  assert.strictEqual(apiClosed.status, 423);

  // окно открыто — страница терминала доступна
  const now = Date.now();
  db.setMidWindow(new Date(now - DAY).toISOString(), new Date(now + DAY).toISOString());
  const open = await ib.get('/exam/ib-mid-1/a-ops/terminal');
  assert.strictEqual(open.status, 200);
  assert.match(open.text, /SECLAB_API/);

  // чужая группа — 404
  const web = await login('st-web');
  assert.strictEqual((await web.get('/exam/ib-mid-1/a-ops/terminal')).status, 404);
  assert.strictEqual((await web.post('/exam/ib-mid-1/a-ops/api/whoami').send({})).status, 404);
});

test('админ: статус блока A из ib_lab_tasks (пройдено по этапам)', async () => {
  db.seedLabTaskForTests('midterm-a', 'st-ib', { passed: 4, total: 4, solved: true });
  const t = await login('teach-a');
  const page = await t.get('/admin/ib-mid');
  assert.strictEqual(page.status, 200);
  const d = await t.get('/admin/ib-mid/students/st-ib');
  assert.strictEqual(d.status, 200);
  assert.match(d.text, /пройдено <strong>4<\/strong> \/ 4 этап/);
});
