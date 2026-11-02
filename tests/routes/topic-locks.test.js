const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');

const app = createApp();

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'teach-x', role: 'teacher', name: 'Препод', group: null, mustChangePassword: false });
  db.createUser({ id: 'st-a', role: 'student', name: 'Алиса', group: 'web-1', mustChangePassword: false });
  db.createUser({ id: 'st-b', role: 'student', name: 'Борис', group: 'web-1', mustChangePassword: false });
  db.createUser({ id: 'st-c', role: 'student', name: 'Виктор', group: 'web-2', mustChangePassword: false });
  db.createUser({ id: 'st-t', role: 'student', name: 'Тест', group: 'TEST', mustChangePassword: false });
});

async function login(id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('group lock → практика и API темы отдают 423 студенту группы, TEST открыт', async () => {
  db.setTopicOverride({ subject: 'html', topicKey: 'text', scope: 'group', target: 'web-1', mode: 'lock', by: 't' });
  const a = await login('st-a');
  assert.strictEqual((await a.get('/subjects/html/text/practice')).status, 423);
  assert.strictEqual((await a.get('/subjects/html/api/text/me')).status, 423);
  const t = await login('st-t');
  assert.notStrictEqual((await t.get('/subjects/html/api/text/me')).status, 423, 'TEST не блокируется');
});

test('student allow перебивает групповой замок: студенту открыто, другому нет', async () => {
  db.setTopicOverride({ subject: 'html', topicKey: 'text', scope: 'group', target: 'web-1', mode: 'lock', by: 't' });
  db.setTopicOverride({ subject: 'html', topicKey: 'text', scope: 'student', target: 'st-a', mode: 'allow', by: 't' });
  const a = await login('st-a');
  assert.strictEqual((await a.get('/subjects/html/api/text/me')).status, 200);
  assert.strictEqual((await a.get('/subjects/html/text/practice')).status, 200);
  const b = await login('st-b');
  assert.strictEqual((await b.get('/subjects/html/api/text/me')).status, 423);
});

test('админ ставит и снимает блокировку темы через POST', async () => {
  const teacher = await login('teach-x');
  const set = await teacher.post('/admin/locks/set').type('form')
    .send({ subject: 'html', topic_key: 'text', scope: 'group', target: 'web-1', mode: 'lock' });
  assert.strictEqual(set.status, 302);
  const a = await login('st-a');
  assert.strictEqual((await a.get('/subjects/html/api/text/me')).status, 423);
  await teacher.post('/admin/locks/clear').type('form')
    .send({ subject: 'html', topic_key: 'text', scope: 'group', target: 'web-1' });
  assert.notStrictEqual((await (await login('st-a')).get('/subjects/html/api/text/me')).status, 423);
});

test('страница /admin/locks открывается в обоих режимах', async () => {
  const teacher = await login('teach-x');
  const g = await teacher.get('/admin/locks?subject=html&scope=group&group=web-1');
  assert.strictEqual(g.status, 200);
  assert.match(g.text, /Доступ к темам/);
  const s = await teacher.get('/admin/locks?subject=html&scope=student');
  assert.strictEqual(s.status, 200);
});

test('фильтр по группам в матрице /admin/html', async () => {
  const teacher = await login('teach-x');
  const w1 = await teacher.get('/admin/html?group=web-1');
  assert.strictEqual(w1.status, 200);
  assert.match(w1.text, /Алиса/);
  assert.doesNotMatch(w1.text, /Виктор/, 'web-2 студента нет при фильтре web-1');
  const w2 = await teacher.get('/admin/html?group=web-2');
  assert.match(w2.text, /Виктор/);
  assert.doesNotMatch(w2.text, /Алиса/);
});
