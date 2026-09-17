const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const fixtures = require('../../src/db');
const { seedAssignment } = require('../helpers/fixtures');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test.beforeEach(() => fixtures.__resetForTests());

test('submissions table lists students with current status', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['solution.zip'] });
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get(`/teacher/assignment/${assignment.id}/submissions`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Иван Иванов/);
  assert.match(res.text, /badge-pending/);
});

test('posting a status update marks submission done and redirects back', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const submission = fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['solution.zip'] });
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent
    .post(`/teacher/assignment/${assignment.id}/submissions/${submission.id}/status`)
    .send({ status: 'done', comment: 'Отлично' });
  assert.strictEqual(res.status, 302);
  const updated = fixtures.getSubmissions().find((s) => s.id === submission.id);
  assert.strictEqual(updated.status, 'done');
  assert.strictEqual(updated.comment, 'Отлично');
});

test('posting an invalid status is rejected and does not mutate the submission', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const submission = fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['solution.zip'] });
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent
    .post(`/teacher/assignment/${assignment.id}/submissions/${submission.id}/status`)
    .send({ status: 'hacked', comment: 'x' });
  assert.strictEqual(res.status, 400);
  const updated = fixtures.getSubmissions().find((s) => s.id === submission.id);
  assert.strictEqual(updated.status, 'pending');
});

test('reopen resets a not_done submission to pending', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const submission = fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['v1.zip'] });
  fixtures.updateSubmissionStatus(submission.id, 'not_done', 'Не хватает merge');
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.post(`/teacher/assignment/${assignment.id}/submissions/${submission.id}/reopen`).send({});
  assert.strictEqual(res.status, 302);
  const updated = fixtures.getSubmissions().find((s) => s.id === submission.id);
  assert.strictEqual(updated.status, 'pending');
});

test('student cannot reach the submissions table', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get(`/teacher/assignment/${assignment.id}/submissions`);
  assert.strictEqual(res.status, 403);
});

test('submissions table shows the resubmission, not the stale rejected root', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const root = fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['v1.zip'] });
  fixtures.updateSubmissionStatus(root.id, 'not_done', 'Не хватает merge в main');
  await new Promise((resolve) => setTimeout(resolve, 5));
  fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['v2.zip'], parentSubmissionId: root.id });

  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get(`/teacher/assignment/${assignment.id}/submissions`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /badge-pending/, 'the newer chained submission must be shown');
  assert.doesNotMatch(res.text, /badge-not_done/, 'the stale rejected root must not be shown once a resubmission exists');
});

test('teacher can download a submitted file with its original name', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const teacher = await loginAs(app, 'teacher-1');

  await student
    .post(`/assignment/${assignment.id}/submit`)
    .attach('files', Buffer.from('archive contents'), 'homework.zip');

  const submission = fixtures.getLatestSubmission(assignment.id, 'student-1');
  const res = await teacher.get(`/teacher/assignment/${assignment.id}/submissions/${submission.id}/files/0`);

  assert.strictEqual(res.status, 200);
  assert.match(res.headers['content-disposition'], /homework\.zip/);
  assert.strictEqual(res.text, 'archive contents');
});

test('downloading an out-of-range file index 404s', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const submission = fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['solution.zip'] });
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get(`/teacher/assignment/${assignment.id}/submissions/${submission.id}/files/99`);
  assert.strictEqual(res.status, 404);
});

test('student cannot download a submission file through the teacher route', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const submission = fixtures.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['solution.zip'] });
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const res = await student.get(`/teacher/assignment/${assignment.id}/submissions/${submission.id}/files/0`);
  assert.strictEqual(res.status, 403);
});

test.after(() => {
  fs.rmSync(path.join(__dirname, '..', '..', 'uploads'), { recursive: true, force: true });
});
