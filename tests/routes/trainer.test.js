const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test.beforeEach(() => db.__resetForTests());

test('trainer list is reachable and shows the first exercise as unlocked', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/trainer');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Практический тренажёр/);
});

test('theory page is reachable for both roles', async () => {
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const teacher = await loginAs(app, 'teacher-1');
  assert.strictEqual((await student.get('/trainer/theory')).status, 200);
  assert.strictEqual((await teacher.get('/trainer/theory')).status, 200);
});

test('the second exercise is locked until the first is solved', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const exercises = db.getSqlExercises();
  const second = exercises[1];

  const lockedRes = await agent.get(`/trainer/${second.id}`);
  assert.strictEqual(lockedRes.status, 403);
});

test('submitting a correct solution unlocks the next exercise and records a correct attempt', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const exercises = db.getSqlExercises();
  const first = exercises[0];
  const second = exercises[1];

  const submitRes = await agent.post(`/trainer/${first.id}/submit`).send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL)' });
  assert.strictEqual(submitRes.status, 200);
  assert.match(submitRes.text, /Верно/);

  const unlockedRes = await agent.get(`/trainer/${second.id}`);
  assert.strictEqual(unlockedRes.status, 200);

  const attempts = db.getSqlAttempts(first.id, 'student-1');
  assert.strictEqual(attempts.length, 1);
  assert.strictEqual(attempts[0].isCorrect, true);
});

test('a query error on submit is stored in the attempt history and shown to the student', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const first = db.getSqlExercises()[0];

  const res = await agent.post(`/trainer/${first.id}/submit`).send({ sql: 'CREATE TALBE oops (id INTEGER)' });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Ошибка/);

  const attempts = db.getSqlAttempts(first.id, 'student-1');
  assert.strictEqual(attempts.length, 1);
  assert.strictEqual(attempts[0].isError, true);
  assert.ok(attempts[0].errorMessage);
});

test('an incorrect but valid submission is stored as not correct, not as an error', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const first = db.getSqlExercises()[0];

  await agent.post(`/trainer/${first.id}/submit`).send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY)' });

  const attempts = db.getSqlAttempts(first.id, 'student-1');
  assert.strictEqual(attempts.length, 1);
  assert.strictEqual(attempts[0].isError, false);
  assert.strictEqual(attempts[0].isCorrect, false);
});

test('teacher can view the results matrix for all students', async () => {
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const teacher = await loginAs(app, 'teacher-1');
  const first = db.getSqlExercises()[0];

  await student.post(`/trainer/${first.id}/submit`).send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL)' });

  const res = await teacher.get('/teacher/trainer/results');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Иван Иванов/);
  assert.match(res.text, /1 \/ \d+/);
});

test('student cannot access the teacher results page', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/teacher/trainer/results');
  assert.strictEqual(res.status, 403);
});

test('teacher can drill into a single student/exercise to see submitted queries and results', async () => {
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const teacher = await loginAs(app, 'teacher-1');
  const first = db.getSqlExercises()[0];

  await student.post(`/trainer/${first.id}/submit`).send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT)' });
  await student.post(`/trainer/${first.id}/submit`).send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL)' });

  const res = await teacher.get(`/teacher/trainer/results/student-1/${first.id}`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Иван Иванов/);
  assert.match(res.text, /История попыток \(2\)/);
  assert.match(res.text, /CREATE TABLE products \(id INTEGER PRIMARY KEY, name TEXT\)/);
  assert.match(res.text, /✓ Верно/);
  assert.match(res.text, /✕ Неверно/);
});

test('attempt history shows the actual query result rows for a SELECT exercise', async () => {
  const { checkSolution } = require('../../src/lib/sql-sandbox');
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const selectExercise = db.getSqlExercises().find((e) => e.topic === 'select' && !e.orderMatters);

  checkSolution('student-1', selectExercise, 'SELECT name, price FROM products');

  const res = await teacher.get(`/teacher/trainer/results/student-1/${selectExercise.id}`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /<th>name<\/th>/);
  assert.match(res.text, /<th>price<\/th>/);
});

test('student cannot view another student\'s attempt history', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const first = db.getSqlExercises()[0];
  const res = await agent.get(`/teacher/trainer/results/student-1/${first.id}`);
  assert.strictEqual(res.status, 403);
});

test('attempt history 404s for an unknown student/exercise pair', async () => {
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const first = db.getSqlExercises()[0];
  const res = await teacher.get(`/teacher/trainer/results/no-such-student/${first.id}`);
  assert.strictEqual(res.status, 404);
});
