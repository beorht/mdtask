const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { seed } = require('./seed');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db');

if (DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8'));
seed(db);

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

function createSubmission({ assignmentId, studentId, files, parentSubmissionId }) {
  const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    'INSERT INTO submissions (id, assignment_id, student_id, files, status, submitted_at, parent_submission_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, assignmentId, studentId, JSON.stringify(files), 'pending', new Date().toISOString(), parentSubmissionId || null);
  return rowToSubmission(db.prepare('SELECT * FROM submissions WHERE id = ?').get(id));
}

function getLatestSubmission(assignmentId, studentId) {
  const row = db
    .prepare('SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ? ORDER BY rowid DESC LIMIT 1')
    .get(assignmentId, studentId);
  return row ? rowToSubmission(row) : null;
}

function updateSubmissionFiles(id, files) {
  db.prepare('UPDATE submissions SET files = ?, submitted_at = ?, comment = NULL WHERE id = ?').run(
    JSON.stringify(files),
    new Date().toISOString(),
    id
  );
  return rowToSubmission(db.prepare('SELECT * FROM submissions WHERE id = ?').get(id));
}

function updateAssignmentTitle(id, title) {
  db.prepare('UPDATE assignments SET title = ? WHERE id = ?').run(title, id);
}

function setAssignmentDueDateForTests(id, dueDate) {
  db.prepare('UPDATE assignments SET due_date = ? WHERE id = ?').run(dueDate, id);
}

function __resetForTests() {
  db.exec('DELETE FROM submissions; DELETE FROM assignments; DELETE FROM courses; DELETE FROM users;');
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
  updateAssignmentTitle,
  setAssignmentDueDateForTests,
  __resetForTests,
};
