const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { seed } = require('./seed');
const { seedSqlExercises } = require('./seed-sql-exercises');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db');

if (DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8'));
seed(db);
seedSqlExercises(db);

function rowToUser(row) {
  return { id: row.id, role: row.role, name: row.name, group: row.student_group };
}

function rowToAssignment(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    mdPath: row.md_path,
    targetType: row.target_type,
    targetStudentId: row.target_student_id,
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
  };
}

function getUsers() {
  return db.prepare('SELECT * FROM users').all().map(rowToUser);
}

function getCourses() {
  return db.prepare('SELECT id, title, teacher_id as teacherId FROM courses').all();
}

function getAssignments() {
  return db.prepare('SELECT * FROM assignments').all().map(rowToAssignment);
}

function getSubmissions() {
  return db.prepare('SELECT * FROM submissions').all().map(rowToSubmission);
}

function updateSubmissionStatus(id, status, comment) {
  const result = db
    .prepare('UPDATE submissions SET status = ?, comment = ?, checked_at = ? WHERE id = ?')
    .run(status, comment || null, new Date().toISOString(), id);
  if (result.changes === 0) return null;
  return rowToSubmission(db.prepare('SELECT * FROM submissions WHERE id = ?').get(id));
}

function reopenSubmission(id) {
  const result = db.prepare("UPDATE submissions SET status = 'pending' WHERE id = ?").run(id);
  if (result.changes === 0) return null;
  return rowToSubmission(db.prepare('SELECT * FROM submissions WHERE id = ?').get(id));
}

function createSubmission({ assignmentId, studentId, files, storedFiles, parentSubmissionId }) {
  const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
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
  return rowToSubmission(db.prepare('SELECT * FROM submissions WHERE id = ?').get(id));
}

function getLatestSubmission(assignmentId, studentId) {
  const row = db
    .prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ? ORDER BY rowid DESC LIMIT 1')
    .get(assignmentId, studentId);
  return row ? rowToSubmission(row) : null;
}

function updateSubmissionFiles(id, files, storedFiles) {
  db.prepare('UPDATE submissions SET files = ?, stored_files = ?, submitted_at = ?, comment = NULL WHERE id = ?').run(
    JSON.stringify(files),
    JSON.stringify(storedFiles || files),
    new Date().toISOString(),
    id
  );
  return rowToSubmission(db.prepare('SELECT * FROM submissions WHERE id = ?').get(id));
}

function createAssignment({ courseId, title, mdPath, targetType, targetStudentId, dueDate }) {
  const id = `assign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    'INSERT INTO assignments (id, course_id, title, md_path, target_type, target_student_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, courseId, title, mdPath, targetType, targetStudentId || null, dueDate);
  return rowToAssignment(db.prepare('SELECT * FROM assignments WHERE id = ?').get(id));
}

function updateAssignmentTitle(id, title) {
  db.prepare('UPDATE assignments SET title = ? WHERE id = ?').run(title, id);
}

function setAssignmentDueDateForTests(id, dueDate) {
  db.prepare('UPDATE assignments SET due_date = ? WHERE id = ?').run(dueDate, id);
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
    createdAt: row.created_at,
  };
}

function getSqlExercises() {
  return db.prepare('SELECT * FROM sql_exercises ORDER BY order_index').all().map(rowToSqlExercise);
}

function getSqlExercise(id) {
  const row = db.prepare('SELECT * FROM sql_exercises WHERE id = ?').get(id);
  return row ? rowToSqlExercise(row) : null;
}

function createSqlAttempt({ exerciseId, studentId, submittedSql, isError, errorMessage, isCorrect }) {
  const id = `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO sql_attempts (id, exercise_id, student_id, submitted_sql, is_error, error_message, is_correct, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, exerciseId, studentId, submittedSql, isError ? 1 : 0, errorMessage || null, isCorrect ? 1 : 0, new Date().toISOString());
  return rowToSqlAttempt(db.prepare('SELECT * FROM sql_attempts WHERE id = ?').get(id));
}

function getSqlAttempts(exerciseId, studentId) {
  return db
    .prepare('SELECT * FROM sql_attempts WHERE exercise_id = ? AND student_id = ? ORDER BY created_at DESC')
    .all(exerciseId, studentId)
    .map(rowToSqlAttempt);
}

function getSolvedSqlExerciseIds(studentId) {
  return new Set(
    db
      .prepare('SELECT DISTINCT exercise_id FROM sql_attempts WHERE student_id = ? AND is_correct = 1')
      .all(studentId)
      .map((r) => r.exercise_id)
  );
}

function getAllSqlAttempts() {
  return db.prepare('SELECT * FROM sql_attempts ORDER BY created_at DESC').all().map(rowToSqlAttempt);
}

function __resetForTests() {
  db.exec('DELETE FROM sql_attempts; DELETE FROM submissions; DELETE FROM assignments; DELETE FROM courses; DELETE FROM users;');
  seed(db);
}

module.exports = {
  getUsers,
  getCourses,
  getAssignments,
  getSubmissions,
  updateSubmissionStatus,
  reopenSubmission,
  createSubmission,
  getLatestSubmission,
  updateSubmissionFiles,
  createAssignment,
  updateAssignmentTitle,
  setAssignmentDueDateForTests,
  getSqlExercises,
  getSqlExercise,
  createSqlAttempt,
  getSqlAttempts,
  getSolvedSqlExerciseIds,
  getAllSqlAttempts,
  __resetForTests,
};
