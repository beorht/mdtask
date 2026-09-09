const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const fixtures = require('../../src/fixtures');

async function loginAs(app, studentId) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId });
  return agent;
}

test.beforeEach(() => fixtures.__resetForTests());

test('student dashboard lists group and individual assignments with badges', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Задание 1: Настройка репозитория/);
  assert.match(res.text, /Дополнительное задание: Рефакторинг/);
  assert.match(res.text, /badge-pending/);
});

test('other student does not see student-1 individual assignment', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-2');
  const res = await agent.get('/');
  assert.doesNotMatch(res.text, /Дополнительное задание: Рефакторинг/);
});

test('unauthenticated request redirects to login', async () => {
  const app = createApp();
  const res = await request(app).get('/');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/login');
});
