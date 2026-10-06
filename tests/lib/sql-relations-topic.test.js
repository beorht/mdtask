const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { checkSolution } = require('../../src/lib/sql-sandbox');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { TOPICS } = require('../../src/lib/sql-topics');
const { TOPIC_THEORY } = require('../../src/content/sql-theory');
const relationsExercises = require('../../src/db/sql-exercises-relations-data');
const db = require('../../src/db');

const { SOLUTIONS } = relationsExercises;

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

function exercise(id) {
  return db.getSqlExercises().find((e) => e.id === id);
}

test.beforeEach(() => db.__resetForTests());

test('the relations topic sits right before JOIN and has theory and seeded exercises', () => {
  const keys = TOPICS.map((t) => t.key);
  assert.strictEqual(keys.indexOf('relations') + 1, keys.indexOf('join'));
  assert.ok(TOPIC_THEORY.relations.md.includes('многие ко многим'));
  const seeded = db.getSqlExercises().filter((e) => e.topic === 'relations');
  assert.strictEqual(seeded.length, relationsExercises.length);
  assert.ok(seeded.every((e) => e.orderIndex > 106));
});

test('every reference solution is graded as correct', () => {
  for (const ex of relationsExercises) {
    const result = checkSolution('student-1', exercise(ex.id), SOLUTIONS[ex.id]);
    assert.strictEqual(result.isCorrect, true, `${ex.id}: ${result.error || 'wrong result'}`);
  }
});

test('equivalent spellings of the foreign key are accepted', () => {
  const result = checkSolution(
    'student-1',
    exercise('relations-1'),
    'create table students (id integer primary key, name text not null, group_id integer not null references groups)'
  );
  assert.strictEqual(result.isCorrect, true, result.error);

  const viaConstraint = checkSolution(
    'student-1',
    exercise('relations-2'),
    'CREATE TABLE enrollments (student_id INTEGER NOT NULL, course_id INTEGER NOT NULL, PRIMARY KEY (student_id, course_id), FOREIGN KEY (student_id) REFERENCES students(id), FOREIGN KEY (course_id) REFERENCES courses(id))'
  );
  assert.strictEqual(viaConstraint.isCorrect, true, viaConstraint.error);
});

test('a table without the foreign key or without the composite key is rejected', () => {
  const noFk = checkSolution('student-1', exercise('relations-1'), 'CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, group_id INTEGER NOT NULL)');
  assert.strictEqual(noFk.isCorrect, false);

  const noPk = checkSolution(
    'student-1',
    exercise('relations-2'),
    'CREATE TABLE enrollments (student_id INTEGER NOT NULL REFERENCES students(id), course_id INTEGER NOT NULL REFERENCES courses(id))'
  );
  assert.strictEqual(noPk.isCorrect, false);
});

test('inserting a link to a missing row fails on the foreign key', () => {
  const result = checkSolution('student-1', exercise('relations-3'), 'INSERT INTO enrollments (student_id, course_id) VALUES (4, 99)');
  assert.strictEqual(result.isCorrect, false);
  assert.match(result.error, /FOREIGN KEY/);
});

test('the theory page shows the practice card for the relations topic', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/trainer/theory/relations');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /data-testid="practice-cta"/);
  assert.match(res.text, /таблица-связка/i);
});

test('one-to-one needs UNIQUE on the foreign key; a table-level UNIQUE counts too', () => {
  const ex = exercise('relations-6');
  const withoutUnique = checkSolution(
    'student-1',
    ex,
    'CREATE TABLE student_cards (id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES students(id), card_number TEXT NOT NULL)'
  );
  assert.strictEqual(withoutUnique.isCorrect, false);

  const tableLevel = checkSolution(
    'student-1',
    ex,
    'CREATE TABLE student_cards (id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL, card_number TEXT NOT NULL, UNIQUE (student_id), FOREIGN KEY (student_id) REFERENCES students(id))'
  );
  assert.strictEqual(tableLevel.isCorrect, true, tableLevel.error);
});

test('changes of linked data can be written with subqueries instead of hard-coded ids', () => {
  const update = checkSolution(
    'student-1',
    exercise('relations-8'),
    "UPDATE students SET group_id = (SELECT id FROM groups WHERE name = 'IB-22') WHERE name = 'Даниил'"
  );
  assert.strictEqual(update.isCorrect, true, update.error);

  const removeTooMuch = checkSolution('student-1', exercise('relations-9'), 'DELETE FROM enrollments WHERE student_id = 2');
  assert.strictEqual(removeTooMuch.isCorrect, true, 'Мадина записана только на JavaScript, так что это тоже верно');

  const wrongRow = checkSolution('student-1', exercise('relations-9'), 'DELETE FROM enrollments WHERE course_id = 3 AND student_id = 1');
  assert.strictEqual(wrongRow.isCorrect, false);
});

test('there are 12 relations exercises in a continuous order after the query topics', () => {
  assert.strictEqual(relationsExercises.length, 12);
  relationsExercises.forEach((e, i) => assert.strictEqual(e.orderIndex, 107 + i));
});
