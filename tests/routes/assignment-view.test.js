// tests/routes/assignment-view.test.js
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

test('renders assignment markdown, TOC and upload block', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/assignment/assign-1');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /<h1 id="[^"]*">Задание 1: Настройка репозитория<\/h1>/);
  assert.match(res.text, /class="toc"/);
  assert.match(res.text, /class="dropzone"/);
});

test('shows resubmission tabs when a submission has a parent', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/assignment/assign-2');
  assert.match(res.text, /Основная сдача/);
  assert.match(res.text, /Пересдача/);
});

test('individual assignment is 404 for a different student', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-2');
  const res = await agent.get('/assignment/assign-4');
  assert.strictEqual(res.status, 404);
});

test('unknown assignment id is 404', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/assignment/does-not-exist');
  assert.strictEqual(res.status, 404);
});
