const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const db = require('../../src/db');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');
const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
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

test(
  'creating a group assignment scoped to a single group only reaches that group',
  withCleanContent(async (writtenFiles) => {
    const app = createApp();
    const agent = await loginAs(app, 'teacher-1');

    const res = await agent.post('/teacher/courses/course-1/assignments').send({
      title: 'Задание для IT-21',
      targetType: 'group',
      sectionTitle: 'Раздел 1',
      targetGroup: 'IT-21',
      dueDate: '2026-12-31',
    });

    assert.strictEqual(res.status, 302);
    const created = db.getAssignments().find((a) => a.title === 'Задание для IT-21');
    assert.strictEqual(created.targetGroup, 'IT-21');
    writtenFiles.push(path.join(CONTENT_DIR, created.mdPath));

    const inGroup = await loginAs(app, 'student-1'); // IT-21
    const otherGroup = await loginAs(app, 'student-5'); // IT-22

    assert.match((await inGroup.get('/')).text, /Задание для IT-21/);
    assert.doesNotMatch((await otherGroup.get('/')).text, /Задание для IT-21/);
  })
);

test(
  'leaving the group field empty targets all groups (both)',
  withCleanContent(async (writtenFiles) => {
    const app = createApp();
    const agent = await loginAs(app, 'teacher-1');

    const res = await agent.post('/teacher/courses/course-1/assignments').send({
      title: 'Задание для всех',
      targetType: 'group',
      sectionTitle: 'Раздел 1',
      dueDate: '2026-12-31',
    });

    assert.strictEqual(res.status, 302);
    const created = db.getAssignments().find((a) => a.title === 'Задание для всех');
    assert.strictEqual(created.targetGroup, null);
    writtenFiles.push(path.join(CONTENT_DIR, created.mdPath));

    const it21 = await loginAs(app, 'student-1'); // IT-21
    const it22 = await loginAs(app, 'student-5'); // IT-22

    assert.match((await it21.get('/')).text, /Задание для всех/);
    assert.match((await it22.get('/')).text, /Задание для всех/);
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
