const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test.beforeEach(() => db.__resetForTests());

test('uploading a .zip on an assignment with a pending submission replaces the files in place', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const before = db.getSubmissions().find((s) => s.id === 'sub-1');
  assert.strictEqual(before.status, 'pending');

  const res = await agent
    .post('/assignment/assign-1/submit')
    .attach('files', Buffer.from('fake zip contents'), 'new-solution.zip');

  assert.strictEqual(res.status, 302);
  const after = db.getSubmissions().find((s) => s.id === 'sub-1');
  assert.deepStrictEqual(after.files, ['new-solution.zip']);
});

test('uploading after a not_done verdict creates a new chained submission', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-2');

  // student-2 has never submitted assign-1 yet; mark a fresh not_done state by
  // creating a rejected submission directly, then resubmit as the student would.
  const rejected = db.createSubmission({ assignmentId: 'assign-1', studentId: 'student-2', files: ['bad.zip'] });
  db.updateSubmissionStatus(rejected.id, 'not_done', 'Не то');

  const res = await agent
    .post('/assignment/assign-1/submit')
    .attach('files', Buffer.from('fixed contents'), 'fixed.zip');

  assert.strictEqual(res.status, 302);
  const submissions = db.getSubmissions().filter((s) => s.assignmentId === 'assign-1' && s.studentId === 'student-2');
  assert.strictEqual(submissions.length, 2);
  const newest = submissions.find((s) => s.id !== rejected.id);
  assert.strictEqual(newest.parentSubmissionId, rejected.id);
  assert.deepStrictEqual(newest.files, ['fixed.zip']);
});

test('rejects a file extension outside .zip/.rar', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const res = await agent
    .post('/assignment/assign-1/submit')
    .attach('files', Buffer.from('not an archive'), 'notes.txt');

  assert.strictEqual(res.status, 302);
  const after = db.getSubmissions().find((s) => s.id === 'sub-1');
  assert.deepStrictEqual(after.files, ['solution.zip'], 'rejected file must not replace the existing submission');
});

test('blocks upload once the due date has passed and nothing was ever submitted', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-2');

  db.setAssignmentDueDateForTests('assign-1', '2000-01-01');

  const res = await agent
    .post('/assignment/assign-1/submit')
    .attach('files', Buffer.from('too late'), 'late.zip');

  assert.strictEqual(res.status, 403);
  const submissions = db.getSubmissions().filter((s) => s.assignmentId === 'assign-1' && s.studentId === 'student-2');
  assert.strictEqual(submissions.length, 0);
});

test('allows upload past due when the teacher reopened a rejected submission', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-2');

  const rejected = db.createSubmission({ assignmentId: 'assign-1', studentId: 'student-2', files: ['bad.zip'] });
  db.updateSubmissionStatus(rejected.id, 'not_done', 'Плохо');
  db.setAssignmentDueDateForTests('assign-1', '2000-01-01');
  db.reopenSubmission(rejected.id);

  const res = await agent
    .post('/assignment/assign-1/submit')
    .attach('files', Buffer.from('fixed after deadline'), 'fixed.zip');

  assert.strictEqual(res.status, 302);
  const after = db.getSubmissions().find((s) => s.id === rejected.id);
  assert.deepStrictEqual(after.files, ['fixed.zip']);
});

test('student cannot submit for an assignment they cannot see', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-2');

  const res = await agent
    .post('/assignment/assign-4/submit')
    .attach('files', Buffer.from('x'), 'x.zip');

  assert.strictEqual(res.status, 404);
});

test.after(() => {
  // best-effort cleanup of any files this suite wrote to disk
  const dir = path.join(__dirname, '..', '..', 'uploads');
  fs.rmSync(dir, { recursive: true, force: true });
});
