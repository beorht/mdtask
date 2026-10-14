const test = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');
const { runPreview, checkSolution, splitStatements, statementType } = require('../../src/lib/sql-sandbox');
const { seedSqlExercises, ALL_EXERCISES } = require('../../src/db/seed-sql-exercises');
const { withProgress } = require('../../src/lib/sql-progress');
const db = require('../../src/db');

test.beforeEach(() => db.__resetForTests());

const exercise = (id) => db.getSqlExercises().find((e) => e.id === id);

test('statements are split on ; outside strings, quoted names and comments', () => {
  assert.deepStrictEqual(splitStatements("SELECT 'a;b'; -- c;d\nSELECT \"x;y\" FROM t /* ; */;"), [
    "SELECT 'a;b'",
    '-- c;d\nSELECT "x;y" FROM t /* ; */',
  ]);
  assert.deepStrictEqual(splitStatements("SELECT 'it''s; fine';   ;  -- only a comment"), ["SELECT 'it''s; fine'"]);
  assert.strictEqual(statementType('-- посмотреть\nINSERT OR IGNORE INTO t VALUES (1)'), 'INSERT');
});

test('a one-statement exercise still refuses several statements but accepts ; inside a string', () => {
  const ex = exercise('relations-5');
  const two = checkSolution('student-1', ex, 'SELECT * FROM courses; SELECT * FROM students;');
  assert.strictEqual(two.success, false);
  assert.match(two.error, /только один SQL-оператор/);
  const inString = runPreview('student-1', ex, "SELECT name FROM students WHERE name = 'a;b';");
  assert.strictEqual(inString.success, true, inString.error);
});

test('a multi-statement exercise runs the statements in order and grades the final state', () => {
  const ex = exercise('relations-13');
  assert.deepStrictEqual(ex.allowedStatements, ['CREATE TABLE', 'INSERT', 'SELECT']);
  const ok = checkSolution(
    'student-1',
    ex,
    `CREATE TABLE groups (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
     CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, group_id INTEGER NOT NULL REFERENCES groups(id));
     INSERT INTO groups VALUES (1, 'WEB-21');
     INSERT INTO groups VALUES (2, 'IB-22');
     INSERT INTO students VALUES (1, 'Алишер', 1), (2, 'Севара', 2);`
  );
  assert.strictEqual(ok.isCorrect, true, ok.error);
  assert.strictEqual(ok.statementCount, 5);
  assert.strictEqual(ok.stateCaption, true);
  assert.strictEqual(ok.rows.length, 2);

  // children before parents: the foreign key refuses, and the error names the statement
  const wrongOrder = checkSolution(
    'student-1',
    ex,
    `CREATE TABLE groups (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
     CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, group_id INTEGER NOT NULL REFERENCES groups(id));
     INSERT INTO students VALUES (1, 'Алишер', 1);`
  );
  assert.strictEqual(wrongOrder.success, false);
  assert.match(wrongOrder.error, /^Оператор №3: FOREIGN KEY constraint failed/);

  // a group without the foreign key is not accepted
  const noFk = checkSolution(
    'student-1',
    ex,
    `CREATE TABLE groups (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
     CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, group_id INTEGER NOT NULL);
     INSERT INTO groups VALUES (1, 'WEB-21'), (2, 'IB-22');
     INSERT INTO students VALUES (1, 'Алишер', 1), (2, 'Севара', 2);`
  );
  assert.strictEqual(noFk.isCorrect, false);
});

test('a statement type outside the allowed list is refused with its number', () => {
  const result = checkSolution('student-1', exercise('relations-15'), 'SELECT * FROM courses; DELETE FROM enrollments;');
  assert.strictEqual(result.success, false);
  assert.match(result.error, /Оператор №2: в этом задании можно использовать только SELECT, INSERT/);
});

test('look first, then insert: the preview shows the last SELECT', () => {
  const ex = exercise('relations-15');
  const preview = runPreview('student-1', ex, 'INSERT INTO enrollments VALUES (5, 2); SELECT * FROM enrollments WHERE student_id = 5;');
  assert.strictEqual(preview.success, true, preview.error);
  assert.strictEqual(preview.statementCount, 2);
  assert.deepStrictEqual(preview.rows.map((r) => r.course_id).sort(), [1, 2]);
  const solved = checkSolution(
    'student-1',
    ex,
    'SELECT * FROM courses;\nINSERT INTO enrollments (student_id, course_id) SELECT 5, id FROM courses WHERE id NOT IN (SELECT course_id FROM enrollments WHERE student_id = 5);'
  );
  assert.strictEqual(solved.isCorrect, true, solved.error);
});

test('INSERT OR IGNORE is an INSERT, and the exercise requires it', () => {
  const ex = exercise('relations-16');
  const plain = checkSolution('student-1', ex, 'INSERT INTO enrollments VALUES (2, 2)');
  assert.strictEqual(plain.isCorrect, false);
  assert.match(plain.notice, /INSERT OR IGNORE/);
  const ignore = checkSolution('student-1', ex, 'insert or ignore into enrollments values (1, 2), (2, 2), (3, 2)');
  assert.strictEqual(ignore.isCorrect, true, ignore.error);
});

test('disbanding a group: deleting it first fails, moving the students first works', () => {
  const ex = exercise('relations-17');
  const first = checkSolution('student-1', ex, 'DELETE FROM groups WHERE id = 2; UPDATE students SET group_id = 1 WHERE group_id = 2;');
  assert.match(first.error, /Оператор №1: FOREIGN KEY constraint failed/);
  const dropStudents = checkSolution('student-1', ex, 'DELETE FROM students WHERE group_id = 2; DELETE FROM groups WHERE id = 2;');
  assert.strictEqual(dropStudents.isCorrect, false, 'students must not be deleted');
});

test('ON DELETE CASCADE is part of the expected structure', () => {
  const ex = exercise('relations-18');
  const noCascade = checkSolution(
    'student-1',
    ex,
    'CREATE TABLE enrollments (student_id INTEGER NOT NULL REFERENCES students(id), course_id INTEGER NOT NULL REFERENCES courses(id), PRIMARY KEY (student_id, course_id))'
  );
  assert.strictEqual(noCascade.isCorrect, false);
});

test('the shop chain and the "find the error" task accept a correct subquery chain only', () => {
  const buggy = "SELECT name FROM students WHERE id IN (SELECT student_id FROM enrollments WHERE course_id = (SELECT id FROM courses WHERE name = 'Базы данных'))";
  const r20 = checkSolution('student-1', exercise('relations-20'), buggy);
  assert.strictEqual(r20.success, true);
  assert.strictEqual(r20.isCorrect, false);
  assert.strictEqual(r20.rows.length, 0);
});

test('seeding moves existing exercises to their new positions when new ones are inserted before them', () => {
  const conn = new Database(':memory:');
  conn.exec(require('fs').readFileSync(require('path').join(__dirname, '../../src/db/schema.sql'), 'utf-8'));
  // an older database: JOIN started right after relations-12 (order 119)
  conn.prepare(
    `INSERT INTO sql_exercises (id, order_index, topic, title, description_md, schema_sql, allowed_statement, check_type, expected_result)
     VALUES ('join-1', 119, 'join', 'старое название', '', '', 'SELECT', 'select_match', '[]'), ('join-2', 120, 'join', 'b', '', '', 'SELECT', 'select_match', '[]')`
  ).run();
  seedSqlExercises(conn);
  seedSqlExercises(conn);
  const row = (id) => conn.prepare('SELECT order_index, title FROM sql_exercises WHERE id = ?').get(id);
  const expected = (id) => ALL_EXERCISES.find((e) => e.id === id).orderIndex;
  assert.deepStrictEqual(row('join-1'), { order_index: expected('join-1'), title: 'старое название' });
  assert.strictEqual(row('join-2').order_index, expected('join-2'));
  assert.strictEqual(row('relations-13').order_index, 119);
  conn.close();
});

test('a solved exercise stays open after new exercises are inserted before it', () => {
  const list = [{ id: 'relations-12' }, { id: 'relations-13' }, { id: 'relations-14' }, { id: 'join-1' }, { id: 'join-2' }, { id: 'join-3' }];
  const progress = withProgress(list, new Set(['relations-12', 'join-1', 'join-2']));
  const open = Object.fromEntries(progress.map((e) => [e.id, e.unlocked]));
  assert.deepStrictEqual(open, {
    'relations-12': true,
    'relations-13': true,
    'relations-14': false,
    'join-1': true,
    'join-2': true,
    'join-3': true,
  });
});
