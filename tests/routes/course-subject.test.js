const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const db = require('../../src/db');
const { DIAGRAM_TYPES } = require('../../src/lib/subjects');
const { seedAssignment, cleanupContentFiles } = require('../helpers/fixtures');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

// A «Проектирование информационных систем» assignment for group IT-21 (student-1..4).
function seedPisAssignment(title = 'Задание 1. Схема процесса «Запись к врачу»') {
  const a = seedAssignment({
    title,
    mdPath: 'section-test-pis/zadanie-1.md',
    targetGroup: 'IT-21',
    markdown: `# ${title}\n\nНарисуйте UML-диаграмму деятельности.\n`,
  });
  db.setAssignmentSubject(a.id, { subject: 'pis', uploadTypes: DIAGRAM_TYPES });
  return db.getAssignments().find((x) => x.id === a.id);
}

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

test.beforeEach(() => db.__resetForTests());
test.afterEach(() => cleanupContentFiles());

test('a course-subject assignment gets its own subject card and page, not Python/JavaScript', async () => {
  const pis = seedPisAssignment();
  const shared = seedAssignment({ title: 'Задача 1. Счётчик', mdPath: 'shared-1.md', markdown: '# Задача 1\n' });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const home = await agent.get('/');
  assert.match(home.text, /href="\/subjects\/pis"/);
  assert.match(home.text, /Проектирование информационных систем/);

  const subject = await agent.get('/subjects/pis');
  assert.strictEqual(subject.status, 200);
  assert.match(subject.text, new RegExp(`/assignment/${pis.id}`));
  assert.doesNotMatch(subject.text, new RegExp(`/assignment/${shared.id}`));
  assert.match(subject.text, /\/subjects\/pis\/theory\/service-model/);
  assert.match(subject.text, /\/subjects\/pis\/theory\/database-schema/);

  const python = await agent.get('/subjects/python');
  assert.doesNotMatch(python.text, new RegExp(`/assignment/${pis.id}`));
  assert.match(python.text, new RegExp(`/assignment/${shared.id}`));

  const page = await agent.get(`/assignment/${pis.id}`);
  assert.match(page.text, /<a href="\/subjects\/pis">Проектирование информационных систем<\/a>/);
  assert.match(page.text, /accept="\.png,\.jpg,\.jpeg,\.pdf,\.docx/);
});

test('theory pages render with the diagrams; the subject is hidden from groups without its assignments', async () => {
  seedPisAssignment();
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const theory = await agent.get('/subjects/pis/theory/service-model');
  assert.strictEqual(theory.status, 200);
  assert.match(theory.text, /<img src="\/img\/pis\/activity-elements\.png"/);
  assert.match(theory.text, /UML Activity/);
  assert.match(theory.text, /Следующий материал/);
  const db2 = await agent.get('/subjects/pis/theory/database-schema');
  assert.match(db2.text, /Многие ко многим/);
  assert.strictEqual((await agent.get('/subjects/pis/theory/nope')).status, 404);

  const other = await loginAs(app, 'student-5'); // IT-22: no PIS assignments
  assert.doesNotMatch((await other.get('/')).text, /href="\/subjects\/pis"/);
  assert.strictEqual((await other.get('/subjects/pis')).status, 404);
  assert.strictEqual((await other.get('/subjects/pis/theory/service-model')).status, 404);
});

test('diagram uploads accept images and documents, refuse other formats; archive-only assignments still refuse images', async () => {
  const pis = seedPisAssignment();
  const zipOnly = seedAssignment({ title: 'Архив', mdPath: 'zip-only.md', markdown: '# Архив\n' });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const ok = await agent.post(`/assignment/${pis.id}/submit`).attach('files', PNG, 'схема.png').attach('files', Buffer.from('x'), 'scheme.drawio');
  assert.strictEqual(ok.headers.location, `/assignment/${pis.id}`);
  assert.deepStrictEqual(db.getSubmissions()[0].files, ['схема.png', 'scheme.drawio']);

  const bad = await agent.post(`/assignment/${zipOnly.id}/submit`).attach('files', PNG, 'схема.png');
  assert.strictEqual(bad.headers.location, `/assignment/${zipOnly.id}?upload=bad`);
  const page = await agent.get(`/assignment/${zipOnly.id}?upload=bad`);
  assert.match(page.text, /этот формат не принимается/);
  assert.strictEqual(db.getSubmissions().length, 1);

  const exe = await agent.post(`/assignment/${pis.id}/submit`).attach('files', Buffer.from('MZ'), 'virus.exe');
  assert.strictEqual(exe.headers.location, `/assignment/${pis.id}?upload=bad`);
});

test('the teacher sees an uploaded image right on the review page', async () => {
  const pis = seedPisAssignment();
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  await student.post(`/assignment/${pis.id}/submit`).attach('files', PNG, 'scheme.png').attach('files', Buffer.from('doc'), 'scheme.docx');
  const sub = db.getSubmissions()[0];

  const teacher = await loginAs(app, 'teacher-1');
  const review = await teacher.get(`/admin/submissions/${sub.id}`);
  assert.strictEqual(review.status, 200);
  assert.match(review.text, new RegExp(`<img src="/admin/submissions/${sub.id}/files/0\\?inline=1"`));
  assert.match(review.text, /скачайте его и откройте в программе/);

  const inline = await teacher.get(`/admin/submissions/${sub.id}/files/0?inline=1`);
  assert.strictEqual(inline.status, 200);
  assert.match(inline.headers['content-type'], /image\/png/);
  assert.strictEqual(inline.headers['content-disposition'], 'inline');
  const docx = await teacher.get(`/admin/submissions/${sub.id}/files/1?inline=1`);
  assert.match(docx.headers['content-disposition'], /attachment/);
});
