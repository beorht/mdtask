const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');

const TASK_1_PATH = path.join(__dirname, '..', '..', 'content', 'src', 'section-1', 'task-1.md');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test('editor page renders existing markdown in the textarea', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/teacher/assignment/assign-1/edit');
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
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/teacher/assignment/assign-1/edit');
  assert.strictEqual(res.status, 403);
});

test('saving the editor writes the new markdown to disk and shows a confirmation', async () => {
  const original = fs.readFileSync(TASK_1_PATH, 'utf-8');
  try {
    const app = createApp();
    const agent = await loginAs(app, 'teacher-1');

    const newMarkdown = '# Обновлённое задание\n\nНовый текст условия.';
    const saveRes = await agent.post('/teacher/assignment/assign-1/save').send({ markdown: newMarkdown });
    assert.strictEqual(saveRes.status, 302);
    assert.strictEqual(fs.readFileSync(TASK_1_PATH, 'utf-8'), newMarkdown);

    const editRes = await agent.get('/teacher/assignment/assign-1/edit?saved=1');
    assert.match(editRes.text, /Обновлённое задание/);
    assert.match(editRes.text, /Сохранено/);
  } finally {
    fs.writeFileSync(TASK_1_PATH, original, 'utf-8');
  }
});

test('student cannot save an assignment', async () => {
  const original = fs.readFileSync(TASK_1_PATH, 'utf-8');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.post('/teacher/assignment/assign-1/save').send({ markdown: '# hacked' });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(fs.readFileSync(TASK_1_PATH, 'utf-8'), original);
});
