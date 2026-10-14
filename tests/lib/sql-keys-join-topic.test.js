const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { checkSolution, containsKeyword } = require('../../src/lib/sql-sandbox');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { TOPICS, groupBySection } = require('../../src/lib/sql-topics');
const { TOPIC_THEORY } = require('../../src/content/sql-theory');
const keysJoinExercises = require('../../src/db/sql-exercises-keys-join-data');
const db = require('../../src/db');
const joinExercises = require('../../src/db/sql-exercises-join-data');

const { SOLUTIONS } = keysJoinExercises;

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

function exercise(id) {
  return db.getSqlExercises().find((e) => e.id === id);
}

test.beforeEach(() => db.__resetForTests());

test('"Практикум" is a separate section after all topics, with theory and seeded practice', () => {
  assert.strictEqual(TOPICS[TOPICS.length - 1].key, 'keys_join');
  const sections = groupBySection(TOPICS);
  assert.deepStrictEqual(sections.map((s) => s.key), ['topics', 'practicum']);
  assert.deepStrictEqual(sections[1].topics.map((t) => t.key), ['keys_join']);
  assert.match(TOPIC_THEORY.keys_join.md, /FOREIGN KEY/);
  assert.match(TOPIC_THEORY.keys_join.md, /LEFT JOIN/);
  const seeded = db.getSqlExercises().filter((e) => e.topic === 'keys_join');
  assert.strictEqual(seeded.length, 12);
});

test('12 exercises continue the order right after JOIN: 6 easy + 2 medium, then 2 easy + 2 medium', () => {
  assert.strictEqual(keysJoinExercises.length, 12);
  keysJoinExercises.forEach((e, i) => {
    assert.strictEqual(e.id, `keys-${i + 1}`);
    assert.strictEqual(e.orderIndex, joinExercises[joinExercises.length - 1].orderIndex + 1 + i);
  });
  const levels = keysJoinExercises.map((e) => (/Уровень:\*\* среднее/.test(e.descriptionMd) ? 'M' : 'E'));
  assert.strictEqual(levels.join(''), 'EEEEEEMMEEMM');
});

test('every reference solution is graded as correct', () => {
  for (const ex of keysJoinExercises) {
    const result = checkSolution('student-1', exercise(ex.id), SOLUTIONS[ex.id]);
    assert.strictEqual(result.isCorrect, true, `${ex.id}: ${result.error || result.notice || 'wrong result'}`);
  }
});

test('JOIN tasks say so in the description and reject a correct result without JOIN', () => {
  for (const id of ['keys-5', 'keys-6', 'keys-7', 'keys-8', 'keys-9', 'keys-10', 'keys-11', 'keys-12']) {
    const ex = exercise(id);
    assert.strictEqual(ex.requiredKeyword, 'JOIN');
    assert.match(ex.descriptionMd, /через `JOIN … ON`/);
  }
  const subquery = checkSolution(
    'student-1',
    exercise('keys-6'),
    "SELECT title FROM courses WHERE teacher_id = (SELECT id FROM teachers WHERE name = 'Бахтиёр Рахимов')"
  );
  assert.strictEqual(subquery.success, true);
  assert.strictEqual(subquery.isCorrect, false);
  assert.match(subquery.notice, /нужно использовать JOIN/);
  const attempt = db.getSqlAttempts('keys-6', 'student-1')[0];
  assert.strictEqual(attempt.isCorrect, false);
  assert.match(attempt.errorMessage, /JOIN/);
});

test('JOIN inside a string or comment does not count, INNER/LEFT JOIN do', () => {
  assert.strictEqual(containsKeyword("SELECT 'JOIN' FROM x", 'JOIN'), false);
  assert.strictEqual(containsKeyword('SELECT * FROM x -- JOIN', 'JOIN'), false);
  assert.strictEqual(containsKeyword('SELECT * FROM x /* JOIN */', 'JOIN'), false);
  assert.strictEqual(containsKeyword('SELECT joined FROM x', 'JOIN'), false);
  assert.strictEqual(containsKeyword('select * from a inner join b on 1', 'JOIN'), true);
  assert.strictEqual(containsKeyword('SELECT * FROM a LEFT JOIN b ON 1', 'JOIN'), true);
});

test('keys tasks accept equivalent spellings and catch typical mistakes', () => {
  const explicitId = checkSolution('student-1', exercise('keys-2'), "INSERT INTO groups (id, name) VALUES (3, 'DB-23')");
  assert.strictEqual(explicitId.isCorrect, true, explicitId.error);
  const takenId = checkSolution('student-1', exercise('keys-2'), "INSERT INTO groups (id, name) VALUES (1, 'DB-23')");
  assert.match(takenId.error, /UNIQUE constraint failed/);

  const badFk = checkSolution('student-1', exercise('keys-4'), "UPDATE courses SET teacher_id = 9 WHERE title = 'Python'");
  assert.match(badFk.error, /FOREIGN KEY constraint failed/);

  const notNullFk = checkSolution(
    'student-1',
    exercise('keys-3'),
    'CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT NOT NULL, teacher_id INTEGER NOT NULL REFERENCES teachers(id))'
  );
  assert.strictEqual(notNullFk.isCorrect, false, 'teacher_id must allow NULL');

  const countStar = checkSolution(
    'student-1',
    exercise('keys-7'),
    'SELECT t.name AS teacher, COUNT(*) AS courses_count FROM teachers t LEFT JOIN courses c ON c.teacher_id = t.id GROUP BY t.id ORDER BY courses_count DESC'
  );
  assert.strictEqual(countStar.isCorrect, false, 'COUNT(*) gives 1 to the teacher without courses');

  const noDistinct = checkSolution(
    'student-1',
    exercise('keys-8'),
    "SELECT s.name FROM students s JOIN enrollments e ON e.student_id = s.id JOIN courses c ON c.id = e.course_id JOIN teachers t ON t.id = c.teacher_id WHERE t.name = 'Бахтиёр Рахимов' ORDER BY s.name"
  );
  assert.strictEqual(noDistinct.isCorrect, false, 'names repeat without DISTINCT');
});

test('the new JOIN tasks catch their typical mistakes', () => {
  const innerJoin = checkSolution('student-1', exercise('keys-10'), 'SELECT c.title FROM courses c JOIN teachers t ON t.id = c.teacher_id WHERE t.id IS NULL');
  assert.strictEqual(innerJoin.isCorrect, false, 'plain JOIN drops the course without a teacher');

  const noDistinctCount = checkSolution(
    'student-1',
    exercise('keys-11'),
    'SELECT t.name AS teacher, COUNT(e.student_id) AS students_count FROM teachers t LEFT JOIN courses c ON c.teacher_id = t.id LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY t.id ORDER BY students_count DESC'
  );
  assert.strictEqual(noDistinctCount.isCorrect, false, 'without DISTINCT Рахимов gets 5');

  const innerInChain = checkSolution(
    'student-1',
    exercise('keys-11'),
    'SELECT t.name AS teacher, COUNT(DISTINCT e.student_id) AS students_count FROM teachers t JOIN courses c ON c.teacher_id = t.id LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY t.id ORDER BY students_count DESC'
  );
  assert.strictEqual(innerInChain.isCorrect, false, 'a plain JOIN in the chain loses Ольга Ким');

  const whereCount = checkSolution(
    'student-1',
    exercise('keys-12'),
    'SELECT c.title AS course, t.name AS teacher, COUNT(*) AS students_count FROM courses c JOIN teachers t ON t.id = c.teacher_id JOIN enrollments e ON e.course_id = c.id WHERE COUNT(*) >= 2 GROUP BY c.id ORDER BY students_count DESC'
  );
  assert.match(whereCount.error, /misuse of aggregate/);

  const noHaving = checkSolution(
    'student-1',
    exercise('keys-12'),
    'SELECT c.title AS course, t.name AS teacher, COUNT(*) AS students_count FROM courses c JOIN teachers t ON t.id = c.teacher_id JOIN enrollments e ON e.course_id = c.id GROUP BY c.id ORDER BY students_count DESC'
  );
  assert.strictEqual(noHaving.isCorrect, false, 'JavaScript with one student must be filtered out');
});

test('the practicum theory covers every task with an example, but never gives a task answer', () => {
  const { md } = TOPIC_THEORY.keys_join;
  for (const heading of ['PRIMARY KEY', 'FOREIGN KEY', 'JOIN — соединение двух таблиц', 'Цепочка JOIN', 'LEFT JOIN и строки без пары', 'COUNT(DISTINCT)', 'HAVING']) {
    assert.ok(md.includes(heading), heading);
  }
  for (let n = 1; n <= keysJoinExercises.length; n += 1) {
    assert.match(md, new RegExp(`\\*Задани[ея][^*]*\\b${n}\\b`), `task ${n} has a section`);
  }
  const norm = (sql) => sql.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const [id, solution] of Object.entries(SOLUTIONS)) {
    assert.ok(!norm(md).includes(norm(solution)), `${id}: the theory must not contain the answer`);
  }
});

test('the SQL subject page and the practice list show "Практикум" as its own block', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  for (const url of ['/subjects/sql', '/trainer', '/trainer/theory']) {
    const res = await agent.get(url);
    assert.strictEqual(res.status, 200, url);
    assert.match(res.text, /class="trainer-section-title">Практикум</, url);
  }
  const theory = await agent.get('/trainer/theory/keys_join');
  assert.strictEqual(theory.status, 200);
  assert.match(theory.text, /courses\.title/);
});
