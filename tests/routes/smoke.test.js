const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const fixtures = require('../../src/fixtures');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test.beforeEach(() => fixtures.__resetForTests());

test('full student journey: dashboard -> assignment -> logout', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const dashboard = await agent.get('/');
  assert.strictEqual(dashboard.status, 200);

  const assignment = await agent.get('/assignment/assign-1');
  assert.strictEqual(assignment.status, 200);

  const logout = await agent.post('/logout');
  assert.strictEqual(logout.status, 302);
  assert.strictEqual(logout.headers.location, '/login');

  const afterLogout = await agent.get('/');
  assert.strictEqual(afterLogout.status, 302);
});

test('full teacher journey: dashboard -> editor -> submissions -> status update', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');

  const dashboard = await agent.get('/teacher');
  assert.strictEqual(dashboard.status, 200);

  const editor = await agent.get('/teacher/assignment/assign-1/edit');
  assert.strictEqual(editor.status, 200);

  const submissions = await agent.get('/teacher/assignment/assign-1/submissions');
  assert.strictEqual(submissions.status, 200);

  const update = await agent
    .post('/teacher/assignment/assign-1/submissions/sub-1/status')
    .send({ status: 'done', comment: 'Готово' });
  assert.strictEqual(update.status, 302);
});
