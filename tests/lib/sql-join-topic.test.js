const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { checkSolution } = require('../../src/lib/sql-sandbox');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { TOPICS } = require('../../src/lib/sql-topics');
const { TOPIC_THEORY } = require('../../src/content/sql-theory');
const joinExercises = require('../../src/db/sql-exercises-join-data');
const relationsExercises = require('../../src/db/sql-exercises-relations-data');

const relationsLast = relationsExercises[relationsExercises.length - 1].orderIndex;
const db = require('../../src/db');

const { SOLUTIONS } = joinExercises;

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

function exercise(id) {
  return db.getSqlExercises().find((e) => e.id === id);
}

test.beforeEach(() => db.__resetForTests());

test('the JOIN topic is the last regular topic, has theory on the college database and seeded practice', () => {
  const keys = TOPICS.filter((t) => !t.section).map((t) => t.key);
  assert.strictEqual(keys[keys.length - 1], 'join');
  assert.match(TOPIC_THEORY.join.md, /LEFT JOIN/);
  assert.match(TOPIC_THEORY.join.md, /enrollments/);
  const seeded = db.getSqlExercises().filter((e) => e.topic === 'join');
  assert.strictEqual(seeded.length, joinExercises.length);
});

test('there are 10 JOIN exercises in a continuous order right after the relations ones', () => {
  assert.strictEqual(joinExercises.length, 10);
  joinExercises.forEach((e, i) => assert.strictEqual(e.orderIndex, relationsLast + 1 + i));
});

test('every reference solution is graded as correct', () => {
  for (const ex of joinExercises) {
    const result = checkSolution('student-1', exercise(ex.id), SOLUTIONS[ex.id]);
    assert.strictEqual(result.isCorrect, true, `${ex.id}: ${result.error || 'wrong result'}`);
  }
});

test('aliases, INNER keyword and the other join direction are accepted', () => {
  const inner = checkSolution(
    'student-1',
    exercise('join-1'),
    'SELECT s.name, g.name AS group_name FROM groups g INNER JOIN students s ON g.id = s.group_id'
  );
  assert.strictEqual(inner.isCorrect, true, inner.error);
});

test('typical JOIN mistakes are rejected', () => {
  const sameNames = checkSolution('student-1', exercise('join-1'), 'SELECT students.name, groups.name FROM students JOIN groups ON students.group_id = groups.id');
  assert.strictEqual(sameNames.isCorrect, false, 'two `name` columns instead of name + group_name');

  const innerLosesEmptyCourse = checkSolution('student-1', exercise('join-7'), 'SELECT c.title, e.student_id FROM courses c JOIN enrollments e ON e.course_id = c.id');
  assert.strictEqual(innerLosesEmptyCourse.isCorrect, false);

  const countStar = checkSolution(
    'student-1',
    exercise('join-10'),
    'SELECT c.title, COUNT(*) AS students_count FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY c.id'
  );
  assert.strictEqual(countStar.isCorrect, false, 'COUNT(*) gives 1 for the empty course');

  const unsorted = checkSolution('student-1', exercise('join-3'), 'SELECT s.name AS student, g.name AS group_name FROM students s JOIN groups g ON s.group_id = g.id');
  assert.strictEqual(unsorted.isCorrect, false, 'order is checked in join-3');
});

test('the JOIN theory page shows the practice card', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/trainer/theory/join');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /data-testid="practice-cta"/);
  assert.match(res.text, /LEFT JOIN/);
});
