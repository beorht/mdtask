const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const fixtures = require('../../src/db');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test.beforeEach(() => fixtures.__resetForTests());

test('submissions table lists students with current status', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/teacher/assignment/assign-1/submissions');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Иван Иванов/);
  assert.match(res.text, /badge-pending/);
});

test('posting a status update marks submission done and redirects back', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent
    .post('/teacher/assignment/assign-1/submissions/sub-1/status')
    .send({ status: 'done', comment: 'Отлично' });
  assert.strictEqual(res.status, 302);
  const submission = fixtures.getSubmissions().find((s) => s.id === 'sub-1');
  assert.strictEqual(submission.status, 'done');
  assert.strictEqual(submission.comment, 'Отлично');
});

test('posting an invalid status is rejected and does not mutate the submission', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent
    .post('/teacher/assignment/assign-1/submissions/sub-1/status')
    .send({ status: 'hacked', comment: 'x' });
  assert.strictEqual(res.status, 400);
  const submission = fixtures.getSubmissions().find((s) => s.id === 'sub-1');
  assert.strictEqual(submission.status, 'pending');
});

test('reopen resets a not_done submission to pending', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.post('/teacher/assignment/assign-2/submissions/sub-2/reopen').send({});
  assert.strictEqual(res.status, 302);
  const submission = fixtures.getSubmissions().find((s) => s.id === 'sub-2');
  assert.strictEqual(submission.status, 'pending');
});

test('student cannot reach the submissions table', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/teacher/assignment/assign-1/submissions');
  assert.strictEqual(res.status, 403);
});
