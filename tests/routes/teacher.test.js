const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test('teacher dashboard lists teacher courses', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/teacher');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Веб-разработка/);
});

test('student cannot access teacher dashboard', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/teacher');
  assert.strictEqual(res.status, 403);
});
