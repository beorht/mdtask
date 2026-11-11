const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');

const app = createApp();

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'teach-m', role: 'teacher', name: 'Препод', group: null, mustChangePassword: false });
  db.createUser({ id: 'st-ib', role: 'student', name: 'Ибрагим Тест', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'st-tst', role: 'student', name: 'Тест Тестов', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'st-web', role: 'student', name: 'Веб Студент', group: 'web-1', mustChangePassword: false });
});

async function login(id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('админ: раздел средней контрольной ИБ открывается, видны блоки и студенты', async () => {
  const t = await login('teach-m');
  const r = await t.get('/admin/ib-mid');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /ИБ-контрольная/);
  assert.match(r.text, /Операции на сервере/);
  assert.match(r.text, /Ибрагим/);
});

test('админ: карточка студента и выставление балла', async () => {
  const t = await login('teach-m');
  const d = await t.get('/admin/ib-mid/students/st-ib');
  assert.strictEqual(d.status, 200);
  assert.match(d.text, /Поиск и исправление ошибок/);
  const s = await t.post('/admin/ib-mid/students/st-ib/score').type('form').send({ task_id: 'c1', score: '7' });
  assert.strictEqual(s.status, 302);
  assert.strictEqual(db.getMidTask('st-ib', 'c1').score, 7);
});

test('студент TEST видит блоки (окно для TEST открыто всегда)', async () => {
  const a = await login('st-tst');
  const r = await a.get('/exam/ib-mid-1');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /Блок A/);
});

test('студент не из группы ИБ получает 404', async () => {
  const a = await login('st-web');
  assert.strictEqual((await a.get('/exam/ib-mid-1')).status, 404);
});

test('студент группы ИБ имеет доступ (200)', async () => {
  const a = await login('st-ib');
  assert.strictEqual((await a.get('/exam/ib-mid-1')).status, 200);
});
