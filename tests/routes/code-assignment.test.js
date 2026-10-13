const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const db = require('../../src/db');
const { seedAssignment, cleanupContentFiles } = require('../helpers/fixtures');
const { createZip } = require('../../src/lib/code-submission');
const { listZip, previewZipEntry } = require('../../src/lib/zip-preview');
const { UPLOAD_DIR } = require('../../src/lib/submission-files');

async function loginAs(app, studentId) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId, password: DEFAULT_PASSWORD });
  return agent;
}

function seedCodeAssignment(opts = {}) {
  const a = seedAssignment({
    title: 'Свой модуль для работы с БД',
    mdPath: 'individual/student-1/code-task.md',
    targetType: 'individual',
    targetStudentId: 'student-1',
    markdown: '# Свой модуль для работы с БД\n\nУсловие.\n',
    ...opts,
  });
  db.setAssignmentCodeFiles(a.id, ['mydb.py', 'main.py']);
  return a;
}

const SOLUTION = { 'mydb.py': 'import sqlite3\n\nclass Database:\n    pass\n', 'main.py': 'import mydb\nprint("Привет")\n' };

test.beforeEach(() => db.__resetForTests());
test.afterEach(() => cleanupContentFiles());

test('createZip output is readable by the review-page zip reader', () => {
  const file = path.join(UPLOAD_DIR, 'zip-roundtrip.zip');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(file, createZip([{ name: 'mydb.py', content: SOLUTION['mydb.py'] }, { name: 'main.py', content: SOLUTION['main.py'] }]));
  const { entries } = listZip(file);
  assert.deepStrictEqual(entries.map((e) => e.name), ['mydb.py', 'main.py']);
  assert.ok(entries.every((e) => e.previewable));
  assert.strictEqual(previewZipEntry(file, 1).text, SOLUTION['main.py']);
  assert.strictEqual(previewZipEntry(file, 1).language, 'python');
});

test('editor assignment page shows the editor with one tab per file and no archive upload', async () => {
  const a = seedCodeAssignment();
  const agent = await loginAs(createApp(), 'student-1');
  const res = await agent.get(`/assignment/${a.id}`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Редактор Python/);
  assert.match(res.text, /data-code-file="mydb.py"/);
  assert.match(res.text, /data-code-file="main.py"/);
  assert.match(res.text, /\/js\/code-editor\.js/);
  assert.doesNotMatch(res.text, /id="dropzone"/);
});

test('ordinary assignment page keeps the archive upload and has no editor', async () => {
  const a = seedAssignment({ title: 'Обычное', mdPath: 'plain-task.md', markdown: '# Обычное\n' });
  const agent = await loginAs(createApp(), 'student-1');
  const res = await agent.get(`/assignment/${a.id}`);
  assert.match(res.text, /id="dropzone"/);
  assert.doesNotMatch(res.text, /code-editor\.js/);
});

test('draft is saved and shown when the page is opened again', async () => {
  const a = seedCodeAssignment();
  const agent = await loginAs(createApp(), 'student-1');
  const save = await agent.post(`/assignment/${a.id}/code/draft`).send({ files: { 'mydb.py': 'x = 1 # <b>\n', 'evil.py': 'nope' } });
  assert.strictEqual(save.status, 200);
  assert.deepStrictEqual(db.getCodeDraft(a.id, 'student-1').files, { 'mydb.py': 'x = 1 # <b>\n', 'main.py': '' });

  const page = await agent.get(`/assignment/${a.id}`);
  assert.match(page.text, /x = 1 # &lt;b&gt;/);
  assert.strictEqual(db.getSubmissions().length, 0, 'a draft is not a submission');
});

test('submit stores solution.zip with the files and creates a pending submission', async () => {
  const a = seedCodeAssignment();
  const agent = await loginAs(createApp(), 'student-1');
  const res = await agent.post(`/assignment/${a.id}/code/submit`).send({ files: SOLUTION });
  assert.strictEqual(res.status, 200);

  const [sub] = db.getSubmissions();
  assert.strictEqual(sub.status, 'pending');
  assert.deepStrictEqual(sub.files, ['solution.zip']);
  const zipPath = path.join(UPLOAD_DIR, a.id, 'student-1', sub.storedFiles[0]);
  assert.deepStrictEqual(listZip(zipPath).entries.map((e) => e.name), ['mydb.py', 'main.py']);
  assert.strictEqual(previewZipEntry(zipPath, 0).text, SOLUTION['mydb.py']);

  // Resubmitting while pending replaces the files of the same submission.
  await agent.post(`/assignment/${a.id}/code/submit`).send({ files: { ...SOLUTION, 'main.py': 'print(2)\n' } });
  assert.strictEqual(db.getSubmissions().length, 1);
});

test('submit rejects empty files', async () => {
  const a = seedCodeAssignment();
  const agent = await loginAs(createApp(), 'student-1');
  const res = await agent.post(`/assignment/${a.id}/code/submit`).send({ files: { 'mydb.py': '# mydb.py\n', 'main.py': 'print(1)' } });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /mydb\.py/);
  assert.strictEqual(db.getSubmissions().length, 0);
});

test('submit is refused once the submission is accepted', async () => {
  const a = seedCodeAssignment();
  const agent = await loginAs(createApp(), 'student-1');
  await agent.post(`/assignment/${a.id}/code/submit`).send({ files: SOLUTION });
  db.updateSubmissionStatus(db.getSubmissions()[0].id, 'done');
  const res = await agent.post(`/assignment/${a.id}/code/submit`).send({ files: SOLUTION });
  assert.strictEqual(res.status, 403);
});

test('another student cannot save or submit someone else\'s editor assignment', async () => {
  const a = seedCodeAssignment();
  const agent = await loginAs(createApp(), 'student-2');
  assert.strictEqual((await agent.post(`/assignment/${a.id}/code/draft`).send({ files: SOLUTION })).status, 404);
  assert.strictEqual((await agent.post(`/assignment/${a.id}/code/submit`).send({ files: SOLUTION })).status, 404);
});

test('archive upload is refused for an editor assignment', async () => {
  const a = seedCodeAssignment();
  const agent = await loginAs(createApp(), 'student-1');
  const res = await agent.post(`/assignment/${a.id}/submit`).attach('files', Buffer.from('PK'), 'x.zip');
  assert.strictEqual(res.status, 400);
  assert.strictEqual(db.getSubmissions().length, 0);
});
