const test = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { checkSolution } = require('../../src/lib/sql-sandbox');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { TOPIC_THEORY } = require('../../src/content/sql-theory');
const { seedSqlExercises } = require('../../src/db/seed-sql-exercises');
const queryExercises = require('../../src/db/sql-exercises-query-data');
const db = require('../../src/db');

const { SOLUTIONS } = queryExercises;
const NEW_TOPICS = ['distinct', 'filter_ops', 'order_by', 'limit', 'aggregate', 'group_by'];

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test.beforeEach(() => db.__resetForTests());

test('there are 16 query exercises covering the six new topics, after the existing curriculum', () => {
  assert.strictEqual(queryExercises.length, 16);
  assert.deepStrictEqual([...new Set(queryExercises.map((e) => e.topic))], NEW_TOPICS);
  assert.strictEqual(queryExercises[0].orderIndex, 91);
  for (const ex of queryExercises) assert.ok(ex.expectedResult.length > 0, `${ex.id} has an empty expected result`);
});

test('the new exercises are seeded into the database', () => {
  const ids = db.getSqlExercises().map((e) => e.id);
  for (const ex of queryExercises) assert.ok(ids.includes(ex.id), `${ex.id} missing`);
});

test('every reference solution is graded as correct', () => {
  const byId = Object.fromEntries(db.getSqlExercises().map((e) => [e.id, e]));
  for (const ex of queryExercises) {
    const result = checkSolution('student-1', byId[ex.id], SOLUTIONS[ex.id]);
    assert.strictEqual(result.isCorrect, true, `${ex.id}: ${result.error || 'wrong result'}`);
  }
});

test('order-sensitive exercises reject an unsorted answer', () => {
  const ex = db.getSqlExercises().find((e) => e.id === 'order_by-1');
  const result = checkSolution('student-1', ex, 'SELECT name, price FROM products');
  assert.strictEqual(result.isCorrect, false);
});

test('seeding adds missing exercises to an already populated table without touching existing rows', () => {
  const conn = new Database(':memory:');
  conn.exec(`CREATE TABLE sql_exercises (
    id TEXT PRIMARY KEY, order_index INTEGER NOT NULL UNIQUE, topic TEXT NOT NULL, title TEXT NOT NULL,
    description_md TEXT NOT NULL, schema_sql TEXT NOT NULL, allowed_statement TEXT NOT NULL, check_type TEXT NOT NULL,
    checker_sql TEXT, order_matters INTEGER NOT NULL DEFAULT 0, expected_result TEXT NOT NULL)`);
  conn
    .prepare(`INSERT INTO sql_exercises VALUES ('distinct-1', 91, 'distinct', 'old title', '', '', 'SELECT', 'select_match', NULL, 0, '[]')`)
    .run();

  seedSqlExercises(conn);
  seedSqlExercises(conn); // idempotent

  const ids = conn.prepare('SELECT id FROM sql_exercises').all().map((r) => r.id);
  for (const ex of queryExercises) assert.ok(ids.includes(ex.id));
  assert.strictEqual(conn.prepare("SELECT title FROM sql_exercises WHERE id = 'distinct-1'").get().title, 'old title');
  conn.close();
});

test('each new topic has a theory page with a practice card linking to the trainer', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  for (const topic of NEW_TOPICS) {
    assert.ok(TOPIC_THEORY[topic], `no theory for ${topic}`);
    const res = await agent.get(`/trainer/theory/${topic}`);
    assert.strictEqual(res.status, 200, topic);
    assert.match(res.text, /data-testid="practice-cta"/);
    // A fresh student hasn't solved the earlier topics yet, so the practice is shown as locked.
    assert.match(res.text, /Практика откроется/);
  }
});

test('the theory practice card links to the practice list once the topic is unlocked', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  // Mark everything before the first new topic as solved.
  for (const ex of db.getSqlExercises().filter((e) => e.orderIndex < 91)) {
    db.createSqlAttempt({ exerciseId: ex.id, studentId: 'student-1', submittedSql: '-', isError: false, errorMessage: null, isCorrect: true });
  }

  const theory = await agent.get('/trainer/theory/distinct');
  assert.match(theory.text, /href="\/trainer\/practice\/distinct"/);
  assert.match(theory.text, /0 \/ 2/);

  const practice = await agent.get('/trainer/practice/distinct');
  assert.strictEqual(practice.status, 200);
  assert.strictEqual((await agent.get('/trainer/distinct-1')).status, 200);
  assert.strictEqual((await agent.get('/trainer/distinct-2')).status, 403);
});

test('theory-only topics have no practice card', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/trainer/theory/join');
  assert.strictEqual(res.status, 200);
  assert.doesNotMatch(res.text, /data-testid="practice-cta"/);
});

test('teachers see the practice card without a student link', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/trainer/theory/group_by');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /data-testid="practice-cta"/);
  assert.match(res.text, /\/admin\/trainer\/results/);
});
