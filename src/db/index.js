const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { seed } = require('./seed');
const { seedSqlExercises } = require('./seed-sql-exercises');
const { seedLanguageExercises } = require('./seed-language-exercises');
const { DEFAULT_PASSWORD, hashPassword, verifyPassword } = require('../lib/password');
const { TEST_GROUP } = require('../lib/test-access');

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
// JSON list of file names (e.g. ["mydb.py","main.py"]): the student writes them in the
// on-site Python editor instead of uploading an archive. NULL = archive upload.
addColumnIfMissing('assignments', 'code_files', 'TEXT');
// Set by the admin "На пересдачу" verdict: a not_done submission the student may
// replace even after the due date (plain not_done only allows it before the deadline).
// SQL trainer: keyword a solution must contain (the "Практикум" JOIN tasks).
addColumnIfMissing('sql_exercises', 'required_keyword', 'TEXT');
addColumnIfMissing('submissions', 'resubmit_allowed', 'INTEGER NOT NULL DEFAULT 0');
// Task variants of ib/ctf/caesar-secret (its generator adds them too).
addColumnIfMissing('ctf_caesar_secrets', 'variant', "TEXT NOT NULL DEFAULT 'password'");
addColumnIfMissing('ctf_caesar_secrets', 'password_file_path', 'TEXT');
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
    codeFiles: row.code_files ? JSON.parse(row.code_files) : null,
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

function getUserById(id) {
  const row = prepared('SELECT * FROM users WHERE id = ?').get(id);
  return row ? rowToUser(row) : null;
}

// Задание «Доступ к защищённой базе данных» (раздел «Информационная безопасность», ib/):
// таблицу заполняет генератор ib/ctf/caesar-secret, solved ставит терминал (ib/server).
function getCaesarSecretForStudent(studentId) {
  return prepared('SELECT * FROM ctf_caesar_secrets WHERE student_id = ?').get(studentId);
}

function getCaesarSecrets() {
  return prepared('SELECT * FROM ctf_caesar_secrets').all();
}

// Задание «Поиск и правка конфигурационных файлов» (ib/, №4): заполняет ib/ctf/configs,
// прогресс (passed/total/solved) пишет терминал после каждой правки файлов.
function rowToConfigTask(row) {
  return row ? { ...row, params: JSON.parse(row.params) } : null;
}

function getConfigTaskForStudent(studentId) {
  return rowToConfigTask(prepared('SELECT * FROM ib_config_tasks WHERE student_id = ?').get(studentId));
}

function getConfigTasks() {
  return prepared('SELECT * FROM ib_config_tasks').all().map(rowToConfigTask);
}

// Задание «Основы работы в терминале Linux» (ib/, №5, тренажёр): заполняет ib/ctf/terminal,
// прогресс по этапам (passed/total, progress JSON) пишет терминал после каждой команды.
function rowToTerminalTask(row) {
  return row ? { ...row, params: JSON.parse(row.params), progress: JSON.parse(row.progress || '{}') } : null;
}

function getTerminalTaskForStudent(studentId) {
  return rowToTerminalTask(prepared('SELECT * FROM ib_terminal_tasks WHERE student_id = ?').get(studentId));
}

// With activity per student from the command log: number of commands and the last one's time.
function getTerminalTasks() {
  return prepared(
    `SELECT t.*, COUNT(l.id) AS commands, MAX(l.created_at) AS last_activity_at
     FROM ib_terminal_tasks t LEFT JOIN ib_terminal_log l ON l.student_id = t.student_id
     GROUP BY t.id`
  )
    .all()
    .map(rowToTerminalTask);
}

// The student's latest commands, newest first.
function getTerminalLog(studentId, limit = 300) {
  return prepared('SELECT * FROM ib_terminal_log WHERE student_id = ? ORDER BY id DESC LIMIT ?')
    .all(studentId, limit)
    .map((row) => ({ ...row, cmds: JSON.parse(row.cmds || '[]') }));
}

// Задания ib/ на общем движке lab_task.py (№6 incident, №7 ssh): строка на задание и студента.
function getLabTaskForStudent(task, studentId) {
  return rowToTerminalTask(prepared('SELECT * FROM ib_lab_tasks WHERE task = ? AND student_id = ?').get(task, studentId));
}

function getLabTasks(task) {
  return prepared(
    `SELECT t.*, COUNT(l.id) AS commands, MAX(l.created_at) AS last_activity_at
     FROM ib_lab_tasks t LEFT JOIN ib_lab_log l ON l.task = t.task AND l.student_id = t.student_id
     WHERE t.task = ?
     GROUP BY t.id`
  )
    .all(task)
    .map(rowToTerminalTask);
}

function getLabLog(task, studentId, limit = 300) {
  return prepared('SELECT * FROM ib_lab_log WHERE task = ? AND student_id = ? ORDER BY id DESC LIMIT ?')
    .all(task, studentId, limit)
    .map((row) => ({ ...row, cmds: JSON.parse(row.cmds || '[]') }));
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
        OR (target_type = 'group' AND (target_group IS NULL OR target_group = ? OR ? = ?))`
  )
    .all(studentId, studentGroup || null, studentGroup || null, TEST_GROUP)
    .map(rowToAssignment);
}

function createUser({ id, role, name, group = null, password = DEFAULT_PASSWORD, mustChangePassword = true }) {
  const { hash, salt } = hashPassword(password);
  prepared(
    'INSERT INTO users (id, role, name, student_group, password_hash, password_salt, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, role, name, group, hash, salt, mustChangePassword ? 1 : 0);
}

function setMustChangePasswordForTests(id) {
  prepared('UPDATE users SET must_change_password = 1 WHERE id = ?').run(id);
}

function getDistinctStudentGroups() {
  return prepared('SELECT DISTINCT student_group FROM users WHERE student_group IS NOT NULL AND student_group != ? ORDER BY student_group')
    .all(TEST_GROUP)
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

function setAssignmentCodeFiles(id, codeFiles) {
  prepared('UPDATE assignments SET code_files = ? WHERE id = ?').run(codeFiles ? JSON.stringify(codeFiles) : null, id);
}

// { fileName: code } of a student's unsent editor work, or null.
function getCodeDraft(assignmentId, studentId) {
  const row = prepared('SELECT files, updated_at FROM code_drafts WHERE assignment_id = ? AND student_id = ?').get(
    assignmentId,
    studentId
  );
  return row ? { files: JSON.parse(row.files), updatedAt: row.updated_at } : null;
}

function saveCodeDraft(assignmentId, studentId, files) {
  const now = new Date().toISOString();
  prepared(
    `INSERT INTO code_drafts (assignment_id, student_id, files, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (assignment_id, student_id) DO UPDATE SET files = excluded.files, updated_at = excluded.updated_at`
  ).run(assignmentId, studentId, JSON.stringify(files), now);
  return now;
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
    requiredKeyword: row.required_keyword || null,
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

// Tests only: the row ib/ctf/configs/generate_configs.py writes for a student.
function seedConfigTaskForTests(studentId, { passed = 0, solved = false } = {}) {
  prepared(
    `INSERT INTO ib_config_tasks (id, student_id, params, passed, total, solved, solved_at, created_at)
     VALUES (?, ?, ?, ?, 8, ?, ?, ?)`
  ).run(
    `config-${studentId}`,
    studentId,
    JSON.stringify({ ssh_port: 2345, apache_port: 8456, upload_max: '64M', decoys: {} }),
    passed,
    solved ? 1 : 0,
    solved ? new Date().toISOString() : null,
    new Date().toISOString()
  );
}

// Tests only: the row ib/ctf/terminal/generate_terminal.py writes, plus optional log lines.
function seedTerminalTaskForTests(studentId, { passed = 0, solved = false, answers = {}, attempts = {}, log = [] } = {}) {
  const progress = { done: passed, opened: { 1: 0 }, completed_at: {}, answers, attempts };
  prepared(
    `INSERT INTO ib_terminal_tasks (id, student_id, params, progress, passed, total, solved, solved_at, created_at)
     VALUES (?, ?, ?, ?, ?, 14, ?, ?, ?)`
  ).run(
    `terminal-${studentId}`,
    studentId,
    JSON.stringify({ project: 'proj-falcon', code_word: 'meadow-42', final_port: 4321 }),
    JSON.stringify(progress),
    passed,
    solved ? 1 : 0,
    solved ? new Date().toISOString() : null,
    new Date().toISOString()
  );
  for (const raw of log) {
    prepared('INSERT INTO ib_terminal_log (student_id, raw, line, cmds, status, created_at) VALUES (?, ?, ?, ?, 0, ?)').run(
      studentId,
      raw,
      raw,
      '[]',
      new Date().toISOString()
    );
  }
}

// Tests only: a row of an ib/ lab task (lab_task.py), plus optional log lines.
function seedLabTaskForTests(task, studentId, { passed = 0, total = 8, solved = false, params = {}, log = [] } = {}) {
  const progress = { done: passed, opened: { 1: 0 }, completed_at: {}, answers: {}, attempts: {} };
  prepared(
    `INSERT INTO ib_lab_tasks (id, task, student_id, params, progress, passed, total, solved, solved_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    `${task}-${studentId}`,
    task,
    studentId,
    JSON.stringify(params),
    JSON.stringify(progress),
    passed,
    total,
    solved ? 1 : 0,
    solved ? new Date().toISOString() : null,
    new Date().toISOString()
  );
  for (const raw of log) {
    prepared('INSERT INTO ib_lab_log (task, student_id, raw, line, cmds, status, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)').run(
      task,
      studentId,
      raw,
      raw,
      '[]',
      new Date().toISOString()
    );
  }
}

// Tests only: the row ib/ctf/caesar-secret/generate_challenge.py writes for a student.
function seedCaesarSecretForTests(studentId, { solved = false } = {}) {
  prepared(
    `INSERT INTO ctf_caesar_secrets (id, student_id, caesar_shift, plain_password, cipher_text, hidden_file_path, solved, solved_at, created_at)
     VALUES (?, ?, 3, 'Falcon123', 'Idofrq123', '~/.ssh/.config.bak', ?, ?, ?)`
  ).run(`secret-${studentId}`, studentId, solved ? 1 : 0, solved ? new Date().toISOString() : null, new Date().toISOString());
}

function __resetForTests() {
  db.exec('DELETE FROM code_drafts; DELETE FROM ib_lab_log; DELETE FROM ib_lab_tasks; DELETE FROM ib_terminal_log; DELETE FROM ib_terminal_tasks; DELETE FROM ib_config_tasks; DELETE FROM ctf_caesar_secrets; DELETE FROM sql_attempts; DELETE FROM submissions; DELETE FROM assignments; DELETE FROM courses; DELETE FROM users;');
  seed(db);
}

module.exports = {
  getUsers,
  verifyUserCredentials,
  getUserById,
  getCaesarSecretForStudent,
  getCaesarSecrets,
  seedCaesarSecretForTests,
  getConfigTaskForStudent,
  getConfigTasks,
  seedConfigTaskForTests,
  getTerminalTaskForStudent,
  getTerminalTasks,
  getTerminalLog,
  seedTerminalTaskForTests,
  getLabTaskForStudent,
  getLabTasks,
  getLabLog,
  seedLabTaskForTests,
  setUserPassword,
  createUser,
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
  setAssignmentCodeFiles,
  getCodeDraft,
  saveCodeDraft,
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
