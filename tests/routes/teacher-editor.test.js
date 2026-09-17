const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { seedAssignment, cleanupContentFiles, CONTENT_DIR } = require('../helpers/fixtures');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test.beforeEach(() => db.__resetForTests());
test.after(() => cleanupContentFiles());

test('editor page renders existing markdown in the textarea', async () => {
  const assignment = seedAssignment({
    title: 'A',
    mdPath: 'test-teacher-editor/task.md',
    markdown: '# Задание\n\nИнициализируйте git-репозиторий проекта.',
  });
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get(`/teacher/assignment/${assignment.id}/edit`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Инициализируйте git-репозиторий/);
});

test('POST /api/preview returns rendered html for given markdown', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.post('/api/preview').send({ markdown: '# Привет' });
  assert.strictEqual(res.status, 200);
  assert.match(res.body.html, /<h1 id="[^"]*">Привет<\/h1>/);
});

test('student cannot reach the editor', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'test-teacher-editor/perm.md', markdown: '# A\n' });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get(`/teacher/assignment/${assignment.id}/edit`);
  assert.strictEqual(res.status, 403);
});

test('saving the editor writes the new markdown to disk and shows a confirmation', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'test-teacher-editor/save.md', markdown: '# Исходный текст\n' });
  const filePath = path.join(CONTENT_DIR, assignment.mdPath);
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');

  const newMarkdown = '# Обновлённое задание\n\nНовый текст условия.';
  const saveRes = await agent.post(`/teacher/assignment/${assignment.id}/save`).send({ markdown: newMarkdown });
  assert.strictEqual(saveRes.status, 302);
  assert.strictEqual(fs.readFileSync(filePath, 'utf-8'), newMarkdown);

  const editRes = await agent.get(`/teacher/assignment/${assignment.id}/edit?saved=1`);
  assert.match(editRes.text, /Обновлённое задание/);
  assert.match(editRes.text, /Сохранено/);
});

test('student cannot save an assignment', async () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'test-teacher-editor/nosave.md', markdown: '# Исходный текст\n' });
  const filePath = path.join(CONTENT_DIR, assignment.mdPath);
  const original = fs.readFileSync(filePath, 'utf-8');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.post(`/teacher/assignment/${assignment.id}/save`).send({ markdown: '# hacked' });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(fs.readFileSync(filePath, 'utf-8'), original);
});
