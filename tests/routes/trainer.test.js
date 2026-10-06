const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const db = require('../../src/db');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
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

  const res = await teacher.get('/admin/trainer/results');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Иван Иванов/);
  assert.match(res.text, /<strong>1<\/strong><span class="a-muted"> \/ \d+/);
});

test('student cannot access the teacher results page', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/admin/trainer/results');
  assert.strictEqual(res.status, 403);
});

test('teacher can drill into a single student/exercise to see submitted queries and results', async () => {
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const teacher = await loginAs(app, 'teacher-1');
  const first = db.getSqlExercises()[0];

  await student.post(`/trainer/${first.id}/submit`).send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT)' });
  await student.post(`/trainer/${first.id}/submit`).send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL)' });

  const res = await teacher.get(`/admin/trainer/student-1/${first.id}`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Иван Иванов/);
  assert.match(res.text, /История попыток \(2\)/);
  assert.match(res.text, /CREATE TABLE products \(id INTEGER PRIMARY KEY, name TEXT\)/);
  assert.match(res.text, /Верно</);
  assert.match(res.text, /Неверно</);
});

test('attempt history shows the actual query result rows for a SELECT exercise', async () => {
  const { checkSolution } = require('../../src/lib/sql-sandbox');
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const selectExercise = db.getSqlExercises().find((e) => e.topic === 'select' && !e.orderMatters);

  checkSolution('student-1', selectExercise, 'SELECT name, price FROM products');

  const res = await teacher.get(`/admin/trainer/student-1/${selectExercise.id}`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /<th>name<\/th>/);
  assert.match(res.text, /<th>price<\/th>/);
});

test('student cannot view another student\'s attempt history', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const first = db.getSqlExercises()[0];
  const res = await agent.get(`/admin/trainer/student-1/${first.id}`);
  assert.strictEqual(res.status, 403);
});

test('attempt history 404s for an unknown student/exercise pair', async () => {
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const first = db.getSqlExercises()[0];
  const res = await teacher.get(`/admin/trainer/no-such-student/${first.id}`);
  assert.strictEqual(res.status, 404);
});

test('previously restricted groups (IB/WEB) now see the full trainer curriculum', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-8'); // seeded with student_group 'IB'

  const theoryIndex = await agent.get('/trainer/theory');
  assert.strictEqual(theoryIndex.status, 200);
  assert.match(theoryIndex.text, /SELECT \+ WHERE/);
  assert.match(theoryIndex.text, />CREATE TABLE</);

  const practiceIndex = await agent.get('/trainer');
  assert.strictEqual(practiceIndex.status, 200);
  assert.match(practiceIndex.text, /SELECT \+ WHERE/);
  assert.match(practiceIndex.text, />CREATE TABLE</);

  assert.strictEqual((await agent.get('/trainer/theory/create_table')).status, 200);
  assert.strictEqual((await agent.get('/trainer/practice/create_table')).status, 200);

  const otherTopicExercise = db.getSqlExercises().find((e) => e.topic === 'create_table');
  assert.strictEqual((await agent.get(`/trainer/${otherTopicExercise.id}`)).status, 200);
});

test('all groups see the full trainer curriculum', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1'); // group IT-21

  const theoryIndex = await agent.get('/trainer/theory');
  assert.match(theoryIndex.text, />CREATE TABLE</);
  assert.strictEqual((await agent.get('/trainer/theory/create_table')).status, 200);
});

test('running a CREATE TABLE shows the created table as an empty table with its columns', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const first = db.getSqlExercises()[0];
  const res = await agent
    .post(`/trainer/${first.id}/run`)
    .send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL)' });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Таблица <code>products<\/code> создана/);
  assert.match(res.text, /class="sql-result-table sql-created-table"/);
  assert.match(res.text, /<th>price<span class="sql-col-meta">REAL · NOT NULL<\/span><\/th>/);
  assert.doesNotMatch(res.text, /has-error/);
});

test('a failing query turns the result panel red and shows the error', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const first = db.getSqlExercises()[0];
  const res = await agent.post(`/trainer/${first.id}/run`).send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY,)' });
  assert.match(res.text, /sql-result-panel has-result has-error/);
  assert.match(res.text, /✕ Ошибка в запросе/);
  assert.match(res.text, /syntax error/);
  assert.doesNotMatch(res.text, /sql-created-caption/);
});

test('after a correct submit the next-task button sits under the editor buttons; failures show an SQL notice there', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const [first, second] = db.getSqlExercises();

  const wrong = await agent.post(`/trainer/${first.id}/submit`).send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY,)' });
  const wrongEditor = wrong.text.slice(wrong.text.indexOf('id="submitBtn"'), wrong.text.indexOf('<!-- LEFT: query result -->'));
  assert.match(wrongEditor, /✕ Ошибка в SQL:/);
  assert.doesNotMatch(wrong.text, /Следующее задание/);

  const ok = await agent
    .post(`/trainer/${first.id}/submit`)
    .send({ sql: 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL)' });
  const okEditor = ok.text.slice(ok.text.indexOf('id="submitBtn"'), ok.text.indexOf('<!-- LEFT: query result -->'));
  assert.match(okEditor, new RegExp(`href="/trainer/${second.id}"[^>]*>Следующее задание →`));
});

test('every exercise kind shows an expected result: structure, table contents or dropped table', async () => {
  const app = createApp();
  // TEST-group account: every exercise is unlocked, so each kind can be opened directly.
  db.createUser({ id: 'tester', role: 'student', name: 'Тест', group: 'TEST', mustChangePassword: false });
  const tester = await loginAs(app, 'tester');

  const create = await tester.get('/trainer/create_table-1');
  assert.match(create.text, /Ожидаемая структура таблицы products/);
  assert.match(create.text, /<th>price<span class="sql-col-meta">REAL · NOT NULL<\/span><\/th>/);

  const insert = await tester.get('/trainer/insert-6');
  assert.match(insert.text, /Ожидаемое содержимое таблицы products после добавления/);
  assert.match(insert.text, /class="sql-row-changed"/);

  const update = await tester.get('/trainer/update-21');
  assert.match(update.text, /Было до изменения/);

  const drop = await tester.get('/trainer/drop-31');
  assert.match(drop.text, /Таблицы <code>products<\/code> в базе быть не должно/);

  const select = await tester.get('/trainer/group_by-2');
  assert.match(select.text, /Ожидаемый результат <span class="sql-hint">\(5 стр\., порядок строк важен\)/);
});
