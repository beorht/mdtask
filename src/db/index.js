const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { seed } = require('./seed');
const { seedSqlExercises } = require('./seed-sql-exercises');
const { seedLanguageExercises } = require('./seed-language-exercises');
const { DEFAULT_PASSWORD, hashPassword, verifyPassword } = require('../lib/password');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db');

if (DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
// Tuning for concurrent read-heavy / bursty-write load (a class submitting at once):
// WAL lets readers proceed while a write is in flight instead of blocking on a single lock.
if (DB_PATH !== ':memory:') db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -20000'); // ~20MB page cache
db.pragma('temp_store = MEMORY');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8'));

// One-off migrations for databases created before newer columns existed.
function addColumnIfMissing(table, column, definition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err) {
    if (!/duplicate column name/i.test(err.message)) throw err;
  }
}

for (const column of ['result_columns', 'result_rows']) {
  addColumnIfMissing('sql_attempts', column, 'TEXT');
}
addColumnIfMissing('users', 'password_hash', 'TEXT');
addColumnIfMissing('users', 'password_salt', 'TEXT');
addColumnIfMissing('users', 'must_change_password', "INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing('assignments', 'target_group', 'TEXT');
// Set by the admin "На пересдачу" verdict: a not_done submission the student may
// replace even after the due date (plain not_done only allows it before the deadline).
addColumnIfMissing('submissions', 'resubmit_allowed', 'INTEGER NOT NULL DEFAULT 0');
db.exec('CREATE INDEX IF NOT EXISTS idx_assignments_target_group ON assignments(target_group)');

// Any account created before password auth existed (real, already-enrolled students/
// teachers) is migrated onto the shared default password and must change it on next login.
const legacyAccountsWithoutPassword = db.prepare('SELECT id FROM users WHERE password_hash IS NULL').all();
if (legacyAccountsWithoutPassword.length > 0) {
  const { hash, salt } = hashPassword(DEFAULT_PASSWORD);
  const migrateStmt = db.prepare(
    'UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 1 WHERE id = ?'
  );
  const migrateAll = db.transaction((rows) => {
    for (const row of rows) migrateStmt.run(hash, salt, row.id);
  });
  migrateAll(legacyAccountsWithoutPassword);
}

seed(db);
seedSqlExercises(db);
seedLanguageExercises(db);

// better-sqlite3 does not cache prepared statements itself — re-preparing the same
// SQL text on every call re-parses it. Under concurrent load (a class hitting the
// same routes at once) that adds up, so the hot-path queries below reuse one
// compiled Statement per SQL string instead of calling db.prepare() per request.
const stmtCache = new Map();
function prepared(sql) {
  let stmt = stmtCache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    stmtCache.set(sql, stmt);
  }
  return stmt;
}

function rowToUser(row) {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    group: row.student_group,
    mustChangePassword: !!row.must_change_password,
  };
}

function rowToAssignment(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    mdPath: row.md_path,
    targetType: row.target_type,
    targetStudentId: row.target_student_id,
    targetGroup: row.target_group,
    dueDate: row.due_date,
  };
}

function rowToSubmission(row) {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    files: JSON.parse(row.files),
    storedFiles: JSON.parse(row.stored_files),
    status: row.status,
    comment: row.comment,
    submittedAt: row.submitted_at,
    checkedAt: row.checked_at,
    checkedBy: row.checked_by,
    parentSubmissionId: row.parent_submission_id,
    resubmitAllowed: !!row.resubmit_allowed,
  };
}

function getUsers() {
  return prepared('SELECT * FROM users').all().map(rowToUser);
}

function verifyUserCredentials(id, password) {
  const row = prepared('SELECT * FROM users WHERE id = ?').get(id);
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash, row.password_salt)) return null;
  return rowToUser(row);
}

function setUserPassword(id, newPassword) {
  const { hash, salt } = hashPassword(newPassword);
  prepared('UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0 WHERE id = ?').run(
    hash,
    salt,
    id
  );
  const row = prepared('SELECT * FROM users WHERE id = ?').get(id);
  return row ? rowToUser(row) : null;
}

function getCourses() {
  return prepared('SELECT id, title, teacher_id as teacherId FROM courses').all();
}

function getAssignments() {
  return prepared('SELECT * FROM assignments').all().map(rowToAssignment);
}

// Indexed lookup for the per-student dashboard/sidebar instead of loading every
// assignment row and filtering it in JS on each request.
function getAssignmentsForStudent(studentId, studentGroup) {
  return prepared(
    `SELECT * FROM assignments
     WHERE (target_type = 'individual' AND target_student_id = ?)
        OR (target_type = 'group' AND (target_group IS NULL OR target_group = ?))`
  )
    .all(studentId, studentGroup || null)
    .map(rowToAssignment);
}

function setMustChangePasswordForTests(id) {
  prepared('UPDATE users SET must_change_password = 1 WHERE id = ?').run(id);
}

function getDistinctStudentGroups() {
  return prepared("SELECT DISTINCT student_group FROM users WHERE student_group IS NOT NULL ORDER BY student_group")
    .all()
    .map((r) => r.student_group);
}

function getSubmissions() {
  return prepared('SELECT * FROM submissions ORDER BY rowid').all().map(rowToSubmission);
}

function updateSubmissionStatus(id, status, comment) {
  const result = prepared('UPDATE submissions SET status = ?, comment = ?, checked_at = ? WHERE id = ?')
    .run(status, comment || null, new Date().toISOString(), id);
  if (result.changes === 0) return null;
  return rowToSubmission(prepared('SELECT * FROM submissions WHERE id = ?').get(id));
}

// Admin review verdict. 'resubmit' is stored as not_done + resubmit_allowed so the
// student can upload a new attempt regardless of the due date.
function reviewSubmission(id, verdict, comment, checkedBy) {
  const status = verdict === 'done' ? 'done' : 'not_done';
  const resubmitAllowed = verdict === 'resubmit' ? 1 : 0;
  const result = prepared(
    'UPDATE submissions SET status = ?, comment = ?, checked_at = ?, checked_by = ?, resubmit_allowed = ? WHERE id = ?'
  ).run(status, comment || null, new Date().toISOString(), checkedBy || null, resubmitAllowed, id);
  if (result.changes === 0) return null;
  return rowToSubmission(prepared('SELECT * FROM submissions WHERE id = ?').get(id));
}

function getSubmissionById(id) {
  const row = prepared('SELECT * FROM submissions WHERE id = ?').get(id);
  return row ? rowToSubmission(row) : null;
}

function updateAssignmentMeta(id, { title, dueDate }) {
  prepared('UPDATE assignments SET title = ?, due_date = ? WHERE id = ?').run(title, dueDate, id);
}

function reopenSubmission(id) {
  const result = prepared("UPDATE submissions SET status = 'pending' WHERE id = ?").run(id);
  if (result.changes === 0) return null;
  return rowToSubmission(prepared('SELECT * FROM submissions WHERE id = ?').get(id));
}

function createSubmission({ assignmentId, studentId, files, storedFiles, parentSubmissionId }) {
  const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  prepared(
    'INSERT INTO submissions (id, assignment_id, student_id, files, stored_files, status, submitted_at, parent_submission_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    assignmentId,
    studentId,
    JSON.stringify(files),
    JSON.stringify(storedFiles || files),
    'pending',
    new Date().toISOString(),
    parentSubmissionId || null
  );
  return rowToSubmission(prepared('SELECT * FROM submissions WHERE id = ?').get(id));
}

function getLatestSubmission(assignmentId, studentId) {
  const row = prepared(
    'SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ? ORDER BY rowid DESC LIMIT 1'
  ).get(assignmentId, studentId);
  return row ? rowToSubmission(row) : null;
}

function updateSubmissionFiles(id, files, storedFiles) {
  prepared('UPDATE submissions SET files = ?, stored_files = ?, submitted_at = ?, comment = NULL WHERE id = ?').run(
    JSON.stringify(files),
    JSON.stringify(storedFiles || files),
    new Date().toISOString(),
    id
  );
  return rowToSubmission(prepared('SELECT * FROM submissions WHERE id = ?').get(id));
}

function createAssignment({ courseId, title, mdPath, targetType, targetStudentId, targetGroup, dueDate }) {
  const id = `assign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  prepared(
    'INSERT INTO assignments (id, course_id, title, md_path, target_type, target_student_id, target_group, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, courseId, title, mdPath, targetType, targetStudentId || null, targetGroup || null, dueDate);
  return rowToAssignment(prepared('SELECT * FROM assignments WHERE id = ?').get(id));
}

function updateAssignmentTitle(id, title) {
  prepared('UPDATE assignments SET title = ? WHERE id = ?').run(title, id);
}

function setAssignmentDueDateForTests(id, dueDate) {
  prepared('UPDATE assignments SET due_date = ? WHERE id = ?').run(dueDate, id);
}

function rowToSqlExercise(row) {
  return {
    id: row.id,
    orderIndex: row.order_index,
    topic: row.topic,
    title: row.title,
    descriptionMd: row.description_md,
    schemaSql: row.schema_sql,
    allowedStatement: row.allowed_statement,
    checkType: row.check_type,
    checkerSql: row.checker_sql,
    orderMatters: !!row.order_matters,
    expectedResult: JSON.parse(row.expected_result),
  };
}

function rowToSqlAttempt(row) {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    studentId: row.student_id,
    submittedSql: row.submitted_sql,
    isError: !!row.is_error,
    errorMessage: row.error_message,
    isCorrect: !!row.is_correct,
    resultColumns: row.result_columns ? JSON.parse(row.result_columns) : null,
    resultRows: row.result_rows ? JSON.parse(row.result_rows) : null,
    createdAt: row.created_at,
  };
}

function rowToLanguageExercise(row) {
  return {
    id: row.id,
    language: row.language,
    orderIndex: row.order_index,
    topic: row.topic,
    topicLabel: row.topic_label,
    title: row.title,
    descriptionMd: row.description_md,
  };
}

function getLanguageExercises(language) {
  return prepared('SELECT * FROM language_exercises WHERE language = ? ORDER BY order_index')
    .all(language)
    .map(rowToLanguageExercise);
}

function getSqlExercises() {
  return prepared('SELECT * FROM sql_exercises ORDER BY order_index').all().map(rowToSqlExercise);
}

function getSqlExercise(id) {
  const row = prepared('SELECT * FROM sql_exercises WHERE id = ?').get(id);
  return row ? rowToSqlExercise(row) : null;
}

function createSqlAttempt({ exerciseId, studentId, submittedSql, isError, errorMessage, isCorrect, resultColumns, resultRows }) {
  const id = `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  prepared(
    `INSERT INTO sql_attempts (id, exercise_id, student_id, submitted_sql, is_error, error_message, is_correct, result_columns, result_rows, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    exerciseId,
    studentId,
    submittedSql,
    isError ? 1 : 0,
    errorMessage || null,
    isCorrect ? 1 : 0,
    resultColumns ? JSON.stringify(resultColumns) : null,
    resultRows ? JSON.stringify(resultRows) : null,
    new Date().toISOString()
  );
  return rowToSqlAttempt(prepared('SELECT * FROM sql_attempts WHERE id = ?').get(id));
}

function getSqlAttempts(exerciseId, studentId) {
  return prepared('SELECT * FROM sql_attempts WHERE exercise_id = ? AND student_id = ? ORDER BY created_at DESC')
    .all(exerciseId, studentId)
    .map(rowToSqlAttempt);
}

function getSolvedSqlExerciseIds(studentId) {
  return new Set(
    prepared('SELECT DISTINCT exercise_id FROM sql_attempts WHERE student_id = ? AND is_correct = 1')
      .all(studentId)
      .map((r) => r.exercise_id)
  );
}

function getAllSqlAttempts() {
  return prepared('SELECT * FROM sql_attempts ORDER BY created_at DESC').all().map(rowToSqlAttempt);
}

function __resetForTests() {
  db.exec('DELETE FROM sql_attempts; DELETE FROM submissions; DELETE FROM assignments; DELETE FROM courses; DELETE FROM users;');
  seed(db);
}

module.exports = {
  getUsers,
  verifyUserCredentials,
  setUserPassword,
  setMustChangePasswordForTests,
  getDistinctStudentGroups,
  getCourses,
  getAssignments,
  getAssignmentsForStudent,
  getSubmissions,
  updateSubmissionStatus,
  reviewSubmission,
  getSubmissionById,
  updateAssignmentMeta,
  reopenSubmission,
  createSubmission,
  getLatestSubmission,
  updateSubmissionFiles,
  createAssignment,
  updateAssignmentTitle,
  setAssignmentDueDateForTests,
  getLanguageExercises,
  getSqlExercises,
  getSqlExercise,
  createSqlAttempt,
  getSqlAttempts,
  getSolvedSqlExerciseIds,
  getAllSqlAttempts,
  __resetForTests,
};
