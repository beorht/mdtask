const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const P = require('../../content/linux/practical.js');

const app = createApp();

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'teach-lx', role: 'teacher', name: 'Препод', group: null, mustChangePassword: false });
  db.createUser({ id: 'st-w1', role: 'student', name: 'Веб Первый', group: 'web-1', mustChangePassword: false });
});

async function teacher() {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: 'teach-lx', password: DEFAULT_PASSWORD });
  return agent;
}

test('админ: раздел Linux открывается, виден студент и команды', async () => {
  const t = await teacher();
  const r = await t.get('/admin/linux');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /Linux Terminal/);
  assert.match(r.text, /Веб Первый/);
  assert.match(r.text, /whoami/);
});

test('админ: прогресс практической и журнал команд студента', async () => {
  // студент выполняет первый шаг практической
  const st = request.agent(app);
  await st.post('/login').send({ studentId: 'st-w1', password: DEFAULT_PASSWORD });
  const r = await st.post('/subjects/linux/practical/api/check').send({ stepId: P.steps[0].id, log: [P.steps[0].solution[0]] });
  assert.strictEqual(r.body.solved, true);

  const t = await teacher();
  // в матрице у студента засчитан 1 шаг
  const page = await t.get('/admin/linux');
  assert.match(page.text, new RegExp(`1 / ${P.steps.length}`));
  // карточка студента: журнал и отметка шага
  const d = await t.get('/admin/linux/students/st-w1');
  assert.strictEqual(d.status, 200);
  assert.match(d.text, /Журнал команд/);
  assert.match(d.text, new RegExp(P.steps[0].solution[0]));
  assert.match(d.text, new RegExp(`практика 1/${P.steps.length}`));
});

test('админ: матрица миссий показывает выполненные задания тренажёра', async () => {
  // отметим студенту пройденную миссию напрямую (как её пишет тренажёр)
  db.saveLinuxProgress('st-w1', 'm1-1', { solvedAt: new Date().toISOString() });
  const t = await teacher();
  const page = await t.get('/admin/linux');
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Миссии тренажёра/);
  assert.match(page.text, /1 \/ 15/); // в колонке «Всего» миссий
  // карточка студента: миссия 1.1 отмечена
  const d = await t.get('/admin/linux/students/st-w1');
  assert.match(d.text, /миссии 1\/15/);
});

test('админ: несуществующий студент — 404', async () => {
  const t = await teacher();
  assert.strictEqual((await t.get('/admin/linux/students/nope')).status, 404);
});
