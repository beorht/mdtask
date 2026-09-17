const test = require('node:test');
const assert = require('node:assert');
const { runPreview, checkSolution } = require('../../src/lib/sql-sandbox');
const db = require('../../src/db');

test.beforeEach(() => db.__resetForTests());

const createExercise = db.getSqlExercises().find((e) => e.topic === 'create_table');
const insertExercise = db.getSqlExercises().find((e) => e.topic === 'insert');
const selectExercise = db.getSqlExercises().find((e) => e.topic === 'select' && !e.orderMatters);
const orderedSelectExercise = db.getSqlExercises().find((e) => e.orderMatters);

test('runPreview rejects a query for the wrong statement type', () => {
  const result = runPreview('student-1', selectExercise, 'DROP TABLE products');
  assert.strictEqual(result.success, false);
  assert.match(result.error, /SELECT/);
});

test('runPreview surfaces a SQLite syntax error', () => {
  const result = runPreview('student-1', selectExercise, 'SELEKT * FROM products');
  assert.strictEqual(result.success, false);
  assert.ok(result.error);
});

test('runPreview does not record an attempt', () => {
  runPreview('student-1', selectExercise, 'SELECT * FROM products');
  assert.strictEqual(db.getSqlAttempts(selectExercise.id, 'student-1').length, 0);
});

test('checkSolution marks a correct SELECT as correct and records the attempt', () => {
  const result = checkSolution('student-1', selectExercise, 'SELECT * FROM products');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.isCorrect, true);
  const attempts = db.getSqlAttempts(selectExercise.id, 'student-1');
  assert.strictEqual(attempts.length, 1);
  assert.strictEqual(attempts[0].isCorrect, true);
  assert.strictEqual(attempts[0].isError, false);
  assert.deepStrictEqual(attempts[0].resultRows, selectExercise.expectedResult);
  assert.ok(Array.isArray(attempts[0].resultColumns) && attempts[0].resultColumns.length > 0);
});

test('checkSolution persists the resulting table state for a non-SELECT exercise', () => {
  checkSolution('student-1', createExercise, 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL)');
  const attempts = db.getSqlAttempts(createExercise.id, 'student-1');
  assert.strictEqual(attempts.length, 1);
  assert.deepStrictEqual(attempts[0].resultColumns, ['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk']);
  assert.strictEqual(attempts[0].resultRows.length, 3);
});

test('checkSolution stores no result rows for an erroring attempt', () => {
  checkSolution('student-1', selectExercise, 'SELECT * FROM nope');
  const attempts = db.getSqlAttempts(selectExercise.id, 'student-1');
  assert.strictEqual(attempts[0].resultRows, null);
  assert.strictEqual(attempts[0].resultColumns, null);
});

test('checkSolution marks a wrong-but-valid SELECT as incorrect', () => {
  const result = checkSolution('student-1', selectExercise, "SELECT * FROM products WHERE category = 'Мебель'");
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.isCorrect, false);
  assert.strictEqual(db.getSqlAttempts(selectExercise.id, 'student-1')[0].isCorrect, false);
});

test('checkSolution records SQL errors in attempt history', () => {
  const result = checkSolution('student-1', selectExercise, 'SELECT * FROM nope');
  assert.strictEqual(result.success, false);
  const attempts = db.getSqlAttempts(selectExercise.id, 'student-1');
  assert.strictEqual(attempts.length, 1);
  assert.strictEqual(attempts[0].isError, true);
  assert.ok(attempts[0].errorMessage);
});

test('checkSolution rejects a reversed row order when orderMatters is true', () => {
  assert.ok(orderedSelectExercise, 'expected at least one order-sensitive exercise in seed data');
  const reversed = checkSolution('student-2', orderedSelectExercise, 'SELECT * FROM products ORDER BY price DESC');
  assert.notStrictEqual(reversed.isCorrect, true);
});

test('checkSolution for CREATE TABLE validates structure via PRAGMA table_info', () => {
  const wrongType = checkSolution('student-1', createExercise, 'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT)');
  assert.strictEqual(wrongType.isCorrect, false, 'missing the required NOT NULL price column should fail');
});

test('checkSolution isolates sandboxes per student in separate db files', () => {
  const Database = require('better-sqlite3');
  const path = require('node:path');

  checkSolution(
    'student-1',
    insertExercise,
    "INSERT INTO products (id, name, category, price, quantity) VALUES (1, 'Ноутбук', 'Электроника', 55000, 10)"
  );
  checkSolution(
    'student-2',
    insertExercise,
    "INSERT INTO products (id, name, category, price, quantity) VALUES (2, 'Мышь', 'Электроника', 1200, 5)"
  );

  const dir = process.env.TRAINER_DB_DIR;
  const student1Db = new Database(path.join(dir, 'student-1', `${insertExercise.id}.db`), { readonly: true });
  const student2Db = new Database(path.join(dir, 'student-2', `${insertExercise.id}.db`), { readonly: true });

  assert.deepStrictEqual(student1Db.prepare('SELECT id FROM products').all(), [{ id: 1 }]);
  assert.deepStrictEqual(student2Db.prepare('SELECT id FROM products').all(), [{ id: 2 }], "student-2's file must be independent of student-1's data");

  student1Db.close();
  student2Db.close();
});

test('resubmitting resets the sandbox instead of accumulating state', () => {
  const first = checkSolution('student-1', insertExercise, "INSERT INTO products (id, name, category, price, quantity) VALUES (1, 'Ноутбук', 'Электроника', 55000, 10)");
  assert.strictEqual(first.isCorrect, true);
  const second = checkSolution('student-1', insertExercise, "INSERT INTO products (id, name, category, price, quantity) VALUES (1, 'Ноутбук', 'Электроника', 55000, 10)");
  assert.strictEqual(second.isCorrect, true, 'running the same insert again should still succeed against a fresh sandbox');
});
