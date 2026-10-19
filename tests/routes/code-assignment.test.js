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

test('starter code fills the editor, and a read-only file always keeps its starter content', async () => {
  const a = seedAssignment({
    title: 'Анализ продаж',
    mdPath: 'individual/student-1/shop.md',
    targetType: 'individual',
    targetStudentId: 'student-1',
    markdown: '# Анализ продаж\n',
  });
  const generator = 'STUDENT = "student-1"\ndef create(path):\n    return path\n';
  db.setAssignmentCodeFiles(a.id, ['main.py', 'analysis.py', 'create_db.py'], {
    starter: { 'main.py': 'import create_db\n', 'create_db.py': generator },
    readonly: ['create_db.py'],
  });
  const agent = await loginAs(createApp(), 'student-1');

  const page = await agent.get(`/assignment/${a.id}`);
  assert.match(page.text, /data-code-file="create_db.py" title="Только для чтения">🔒 create_db.py/);
  assert.match(page.text, /data-code-source="create_db.py" data-code-readonly="1" readonly/);
  assert.match(page.text, /STUDENT = &#34;student-1&#34;/);
  assert.match(page.text, />import create_db\n<\/textarea>/);
  assert.match(page.text, />\# analysis.py\n<\/textarea>/);

  // a tampered read-only file is ignored both in the draft and in the submitted archive
  const tampered = { 'main.py': 'print(1)\n', 'analysis.py': 'x = 1\n', 'create_db.py': 'STUDENT = "someone-else"\n' };
  await agent.post(`/assignment/${a.id}/code/draft`).send({ files: tampered }).expect(200);
  const again = await agent.get(`/assignment/${a.id}`);
  assert.match(again.text, />print\(1\)\n<\/textarea>/);
  assert.match(again.text, /STUDENT = &#34;student-1&#34;/);

  await agent.post(`/assignment/${a.id}/code/submit`).send({ files: tampered }).expect(200);
  const sub = db.getSubmissions().find((s) => s.assignmentId === a.id);
  const { entries } = listZip(path.join(UPLOAD_DIR, a.id, 'student-1', sub.storedFiles[0]));
  const archive = path.join(UPLOAD_DIR, a.id, 'student-1', sub.storedFiles[0]);
  assert.deepStrictEqual(entries.map((e) => e.name), ['main.py', 'analysis.py', 'create_db.py']);
  assert.strictEqual(previewZipEntry(archive, 2).text, generator);
  assert.strictEqual(previewZipEntry(archive, 0).text, 'print(1)\n');
});
