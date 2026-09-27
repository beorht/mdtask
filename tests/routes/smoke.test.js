const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const fixtures = require('../../src/db');
const { seedAssignment, cleanupContentFiles } = require('../helpers/fixtures');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test.beforeEach(() => fixtures.__resetForTests());
test.after(() => cleanupContentFiles());

test('full student journey: dashboard -> assignment -> logout', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'test-smoke/student.md', markdown: '# A\n' });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const dashboard = await agent.get('/');
  assert.strictEqual(dashboard.status, 200);

  const assignmentRes = await agent.get(`/assignment/${assignment.id}`);
  assert.strictEqual(assignmentRes.status, 200);

  const logout = await agent.post('/logout');
  assert.strictEqual(logout.status, 302);
  assert.strictEqual(logout.headers.location, '/login');

  const afterLogout = await agent.get('/');
  assert.strictEqual(afterLogout.status, 302);
});

test('full teacher journey: dashboard -> editor -> works -> review', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'test-smoke/teacher.md', markdown: '# A\n' });
  const submission = fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['a.zip'] });
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');

  assert.strictEqual((await agent.get('/admin')).status, 200);
  assert.strictEqual((await agent.get(`/admin/assignments/${assignment.id}/edit`)).status, 200);
  assert.strictEqual((await agent.get('/admin/submissions?tab=review')).status, 200);
  assert.strictEqual((await agent.get(`/admin/submissions/${submission.id}`)).status, 200);

  const update = await agent.post(`/admin/submissions/${submission.id}/review`).send({ verdict: 'done', comment: 'Готово' });
  assert.strictEqual(update.status, 302);
  assert.strictEqual(fixtures.getSubmissionById(submission.id).status, 'done');
});
