const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test('editor page renders existing markdown in the textarea', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/teacher/assignment/assign-1/edit');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Инициализируйте git-репозиторий/);
});

test('POST /api/preview returns rendered html for given markdown', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.post('/api/preview').send({ markdown: '# Привет' });
  assert.strictEqual(res.status, 200);
  assert.match(res.body.html, /<h1 id="[^"]*">Привет<\/h1>/);
});

test('student cannot reach the editor', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/teacher/assignment/assign-1/edit');
  assert.strictEqual(res.status, 403);
});
