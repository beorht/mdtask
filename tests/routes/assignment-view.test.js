// tests/routes/assignment-view.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const fixtures = require('../../src/db');
const { seedAssignment, cleanupContentFiles } = require('../helpers/fixtures');

async function loginAs(app, studentId) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId });
  return agent;
}

test.beforeEach(() => fixtures.__resetForTests());
test.after(() => cleanupContentFiles());

test('renders assignment markdown, TOC and upload block', async () => {
  const assignment = seedAssignment({
    title: 'A',
    mdPath: 'test-assignment-view/basic.md',
    markdown: '# Тестовое задание\n\nУсловие.',
  });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get(`/assignment/${assignment.id}`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /<h1 id="[^"]*">Тестовое задание<\/h1>/);
  assert.match(res.text, /class="toc"/);
  assert.match(res.text, /class="dropzone"/);
});

test('shows resubmission tabs when a submission has a parent', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'test-assignment-view/resubmit.md', markdown: '# A\n' });
  const root = fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['v1.zip'] });
  fixtures.updateSubmissionStatus(root.id, 'not_done', 'Не то');
  fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['v2.zip'], parentSubmissionId: root.id });

  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get(`/assignment/${assignment.id}`);
  assert.match(res.text, /Основная сдача/);
  assert.match(res.text, /Пересдача/);
});

test('individual assignment is 404 for a different student', async () => {
  const individual = seedAssignment({
    title: 'Персональное',
    mdPath: 'test-assignment-view/individual/student-1/x.md',
    targetType: 'individual',
    targetStudentId: 'student-1',
    markdown: '# X\n',
  });
  const app = createApp();
  const agent = await loginAs(app, 'student-2');
  const res = await agent.get(`/assignment/${individual.id}`);
  assert.strictEqual(res.status, 404);
});

test('unknown assignment id is 404', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/assignment/does-not-exist');
  assert.strictEqual(res.status, 404);
});
