const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');
const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

function withCleanContent(fn) {
  return async () => {
    const summaryBefore = fs.readFileSync(SUMMARY_PATH, 'utf-8');
    const writtenFiles = [];
    try {
      await fn(writtenFiles);
    } finally {
      fs.writeFileSync(SUMMARY_PATH, summaryBefore, 'utf-8');
      writtenFiles.forEach((f) => fs.rmSync(f, { force: true }));
    }
  };
}

test.beforeEach(() => db.__resetForTests());

test(
  'creating a group assignment writes the md file, extends SUMMARY.md, and inserts a DB row',
  withCleanContent(async (writtenFiles) => {
    const app = createApp();
    const agent = await loginAs(app, 'teacher-1');

    const res = await agent.post('/teacher/courses/course-1/assignments').send({
      title: 'Новое тестовое задание',
      targetType: 'group',
      sectionTitle: 'Раздел 1',
      dueDate: '2026-12-31',
    });

    assert.strictEqual(res.status, 302);
    assert.match(res.headers.location, /^\/teacher\/assignment\/assign-.+\/edit$/);

    const assignments = db.getAssignments();
    const created = assignments.find((a) => a.title === 'Новое тестовое задание');
    assert.ok(created, 'assignment row should exist');
    assert.strictEqual(created.targetType, 'group');
    assert.strictEqual(created.mdPath, 'section-razdel-1/novoe-testovoe-zadanie.md');

    const filePath = path.join(CONTENT_DIR, created.mdPath);
    writtenFiles.push(filePath);
    assert.match(fs.readFileSync(filePath, 'utf-8'), /# Новое тестовое задание/);

    const summary = fs.readFileSync(SUMMARY_PATH, 'utf-8');
    assert.match(summary, /\[Новое тестовое задание\]\(section-razdel-1\/novoe-testovoe-zadanie\.md\)/);
  })
);

test(
  'creating an individual assignment scopes it to the chosen student',
  withCleanContent(async (writtenFiles) => {
    const app = createApp();
    const agent = await loginAs(app, 'teacher-1');

    const res = await agent.post('/teacher/courses/course-1/assignments').send({
      title: 'Персональное задание',
      targetType: 'individual',
      targetStudentId: 'student-2',
      dueDate: '2026-12-31',
    });

    assert.strictEqual(res.status, 302);
    const created = db.getAssignments().find((a) => a.title === 'Персональное задание');
    assert.strictEqual(created.targetType, 'individual');
    assert.strictEqual(created.targetStudentId, 'student-2');
    assert.strictEqual(created.mdPath, 'individual/student-2/personalnoe-zadanie.md');

    writtenFiles.push(path.join(CONTENT_DIR, created.mdPath));
    const summary = fs.readFileSync(SUMMARY_PATH, 'utf-8');
    assert.match(summary, /Мои доп\. задания[\s\S]*Персональное задание/);
  })
);

test('rejects creation with missing required fields and does not touch disk', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const summaryBefore = fs.readFileSync(SUMMARY_PATH, 'utf-8');

  const res = await agent.post('/teacher/courses/course-1/assignments').send({ title: '', targetType: 'group' });

  assert.strictEqual(res.status, 400);
  assert.match(res.text, /Заполните все обязательные поля/);
  assert.strictEqual(fs.readFileSync(SUMMARY_PATH, 'utf-8'), summaryBefore);
});

test('student cannot create an assignment', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.post('/teacher/courses/course-1/assignments').send({
    title: 'Hack',
    targetType: 'group',
    sectionTitle: 'Раздел 1',
    dueDate: '2026-12-31',
  });
  assert.strictEqual(res.status, 403);
});
