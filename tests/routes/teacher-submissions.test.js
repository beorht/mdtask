const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
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

test('submissions table shows the resubmission, not the stale rejected root', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/teacher/assignment/assign-2/submissions');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /badge-pending/, 'the newer chained submission (sub-3, pending) must be shown');
  assert.doesNotMatch(res.text, /badge-not_done/, 'the stale rejected root (sub-2) must not be shown once a resubmission exists');
});

test('teacher can download a submitted file with its original name', async () => {
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const teacher = await loginAs(app, 'teacher-1');

  await student
    .post('/assignment/assign-1/submit')
    .attach('files', Buffer.from('archive contents'), 'homework.zip');

  const submission = fixtures.getLatestSubmission('assign-1', 'student-1');
  const res = await teacher.get(`/teacher/assignment/assign-1/submissions/${submission.id}/files/0`);

  assert.strictEqual(res.status, 200);
  assert.match(res.headers['content-disposition'], /homework\.zip/);
  assert.strictEqual(res.text, 'archive contents');
});

test('downloading an out-of-range file index 404s', async () => {
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get('/teacher/assignment/assign-1/submissions/sub-1/files/99');
  assert.strictEqual(res.status, 404);
});

test('student cannot download a submission file through the teacher route', async () => {
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const res = await student.get('/teacher/assignment/assign-1/submissions/sub-1/files/0');
  assert.strictEqual(res.status, 403);
});

test.after(() => {
  fs.rmSync(path.join(__dirname, '..', '..', 'uploads'), { recursive: true, force: true });
});
