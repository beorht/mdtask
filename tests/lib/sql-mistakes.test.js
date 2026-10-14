const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { classifyAttempt, buildReport, mistakesByExercise } = require('../../src/lib/sql-mistakes');
const db = require('../../src/db');

test.beforeEach(() => db.__resetForTests());

const exercise = (id) => db.getSqlExercises().find((e) => e.id === id);

let clock = 0;
function attempt(exerciseId, sql, { studentId = 'student-1', isCorrect = false, isError = false, errorMessage = null } = {}) {
  clock += 1;
  return { exerciseId, studentId, submittedSql: sql, isCorrect, isError, errorMessage, createdAt: `2026-10-14T10:00:${String(clock).padStart(2, '0')}.000Z` };
}
const keyOf = (a) => (classifyAttempt(a, exercise(a.exerciseId)) || {}).key;

// Real mistakes from the «Связи между таблицами» topic.
test('a subquery column that silently comes from the outer query is recognised', () => {
  const a = attempt(
    'relations-5',
    "SELECT name FROM students WHERE id IN (SELECT student_id FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE name = 'Python'));"
  );
  const m = classifyAttempt(a, exercise('relations-5'));
  assert.strictEqual(m.key, 'outer_column');
  assert.match(m.detail, /«name».*courses/);
  // the same idea, written correctly with title, is not flagged
  const fine = attempt('relations-5', "SELECT name FROM students WHERE id IN (SELECT s.student_id FROM enrollments s WHERE s.course_id = 7)");
  assert.notStrictEqual(keyOf(fine), 'outer_column');
});

test('SQLite errors map to explained mistakes with a concrete hint', () => {
  const err = (sql, errorMessage, id = 'relations-3') => attempt(id, sql, { isError: true, errorMessage });
  assert.strictEqual(keyOf(err('INSERT INTO enrollments VALUES (1, 2)', 'UNIQUE constraint failed: enrollments.student_id, enrollments.course_id')), 'unique');
  assert.strictEqual(keyOf(err('INSERT INTO enrollments VALUES (1, 10)', 'FOREIGN KEY constraint failed')), 'foreign_key');
  assert.strictEqual(keyOf(err('SELECT 1; SELECT 2', 'Разрешён только один SQL-оператор за один раз.')), 'multi_statement');
  assert.strictEqual(keyOf(err('SELECT * FROM students', 'В этом задании ожидается запрос INSERT.')), 'wrong_statement');
  assert.strictEqual(keyOf(err('```sql\nINSERT INTO enrollments VALUES (4, 2);\n```', 'Разрешён только один SQL-оператор за один раз.')), 'markdown');
  assert.strictEqual(keyOf(err('INSERT INTO enrollments VALUES (X, Y)', 'no such column: X')), 'placeholder');

  const typo = classifyAttempt(err('DELETE FROM enrollments WHERE students_id = 2', 'no such column: students_id', 'relations-9'), exercise('relations-9'));
  assert.strictEqual(typo.key, 'no_column');
  assert.match(typo.detail, /правильно «student_id»/);
  const wrongTable = classifyAttempt(
    err("INSERT INTO enrollments VALUES ((SELECT id FROM students WHERE name = 'Севара'), (SELECT id FROM courses WHERE name = 'Базы данных'))", 'no such column: name'),
    exercise('relations-3')
  );
  assert.match(wrongTable.detail, /groups, students/);
});

test('placeholder and unknown values in a query that ran are recognised', () => {
  assert.strictEqual(keyOf(attempt('relations-4', "SELECT name FROM students WHERE group_id = (SELECT id FROM groups WHERE name = 'Название_группы')")), 'placeholder');
  const unknown = classifyAttempt(attempt('relations-4', "SELECT name FROM students WHERE group_id = (SELECT id FROM groups WHERE name = 'web-21')"), exercise('relations-4'));
  assert.strictEqual(unknown.key, 'unknown_value');
  assert.match(unknown.detail, /в данных есть «WEB-21»/);
});

test('the report counts attempts up to the first correct one and spots guessing and resending', () => {
  const ex = exercise('relations-3');
  const unique = { isError: true, errorMessage: 'UNIQUE constraint failed: enrollments.student_id, enrollments.course_id' };
  const attempts = [
    attempt('relations-3', 'INSERT INTO enrollments (student_id, course_id) VALUES (1, 2)', unique),
    attempt('relations-3', 'INSERT INTO enrollments (student_id, course_id) VALUES (1, 2)', unique),
    attempt('relations-3', 'INSERT INTO enrollments (student_id, course_id) VALUES (3, 2)', unique),
    attempt('relations-3', 'INSERT INTO enrollments (student_id, course_id) VALUES (1, 3)'),
    attempt('relations-3', 'INSERT INTO enrollments (student_id, course_id) VALUES (4, 2)', { isCorrect: true }),
    attempt('relations-3', 'SELECT 1', { isError: true, errorMessage: 'В этом задании ожидается запрос INSERT.' }), // after solving: ignored
  ];
  const report = buildReport(attempts.reverse(), ex); // order of the input doesn't matter
  assert.strictEqual(report.attempts, 5);
  assert.strictEqual(report.wrong, 4);
  assert.strictEqual(report.solved, true);
  assert.strictEqual(report.firstTry, false);
  const counts = Object.fromEntries(report.items.map((i) => [i.key, i.count]));
  assert.deepStrictEqual(counts, { unique: 3, wrong_result: 1, guessing: 3, repeat: 1 });
  assert.ok(report.items.every((i) => i.title && i.explain && i.tip));

  const firstTry = buildReport([attempt('relations-3', 'INSERT INTO enrollments VALUES (4, 2)', { isCorrect: true })], ex);
  assert.strictEqual(firstTry.firstTry, true);
  assert.deepStrictEqual(firstTry.items, []);
  assert.strictEqual(buildReport([], ex), null);
});

test('mistakes per exercise count students and attempts', () => {
  const exercises = db.getSqlExercises();
  const outer = "SELECT name FROM students WHERE id IN (SELECT student_id FROM enrollments WHERE course_id = (SELECT id FROM courses WHERE name = 'Python'))";
  const stats = mistakesByExercise(exercises, [
    attempt('relations-5', outer, { studentId: 'student-1' }),
    attempt('relations-5', outer, { studentId: 'student-1' }),
    attempt('relations-5', outer, { studentId: 'student-2' }),
    attempt('relations-5', 'SELECT 1', { studentId: 'student-3', isCorrect: true }),
  ]);
  assert.strictEqual(stats.length, 1);
  assert.strictEqual(stats[0].students, 2);
  assert.strictEqual(stats[0].wrong, 3);
  assert.deepStrictEqual(
    stats[0].items.map((i) => [i.key, i.students, i.attempts]),
    [['outer_column', 2, 3], ['repeat', 1, 1]]
  );
});

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('after solving, the exercise page shows the attempt review; the teacher sees it too', async () => {
  // open relations-5 for student-1: the exercise before it is solved
  db.createSqlAttempt({ exerciseId: 'relations-4', studentId: 'student-1', submittedSql: 'x', isCorrect: true });
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const ex = exercise('relations-5');
  const outer = "SELECT name FROM students WHERE id IN (SELECT student_id FROM enrollments WHERE course_id = (SELECT id FROM courses WHERE name = 'Python'))";
  await student.post(`/trainer/${ex.id}/submit`).type('form').send({ sql: outer });
  const before = await student.get(`/trainer/${ex.id}`);
  assert.doesNotMatch(before.text, /Разбор ваших попыток/);

  const solved = await student
    .post(`/trainer/${ex.id}/submit`)
    .type('form')
    .send({ sql: "SELECT name FROM students WHERE id IN (SELECT student_id FROM enrollments WHERE course_id = (SELECT id FROM courses WHERE title = 'Python'))" });
  assert.match(solved.text, /<details class="sql-review" open>/);
  assert.match(solved.text, /Столбец взят из внешнего запроса/);
  assert.match(solved.text, /2 попытки до верного решения/);

  const teacher = await loginAs(app, 'teacher-1');
  const page = await teacher.get(`/admin/trainer/student-1/${ex.id}`);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Разбор ошибок/);
  assert.match(page.text, /Столбец взят из внешнего запроса/);

  const mistakes = await teacher.get('/admin/trainer/mistakes?topic=relations');
  assert.strictEqual(mistakes.status, 200);
  assert.match(mistakes.text, /Кто учится на курсе Python/);
  assert.match(mistakes.text, /Столбец взят из внешнего запроса <span class="a-muted">· 1 · 1<\/span>/);
});

test('a multi-statement exercise page says several statements are allowed', async () => {
  for (const id of ['relations-1', 'relations-2', 'relations-3', 'relations-4', 'relations-5', 'relations-6', 'relations-7', 'relations-8', 'relations-9', 'relations-10', 'relations-11', 'relations-12']) {
    db.createSqlAttempt({ exerciseId: id, studentId: 'student-1', submittedSql: 'x', isCorrect: true });
  }
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const page = await student.get('/trainer/relations-13');
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Можно несколько операторов через <code>;<\/code>/);
  assert.match(page.text, /Операторы: <code>CREATE TABLE<\/code>, <code>INSERT<\/code>, <code>SELECT<\/code>/);
  const run = await student
    .post('/trainer/relations-13/run')
    .type('form')
    .send({ sql: "CREATE TABLE groups (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO groups VALUES (1, 'WEB-21'); SELECT * FROM groups;" });
  assert.match(run.text, /Выполнено операторов: <strong>3<\/strong>/);
});
