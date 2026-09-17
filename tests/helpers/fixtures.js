const fs = require('node:fs');
const path = require('node:path');
const db = require('../../src/db');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');

// Test-only content fixtures: routes read assignment markdown straight off
// disk (src/routes/student.js, src/routes/teacher.js), so tests that exercise
// those routes need a real file under content/src. Written files are tracked
// here and removed by cleanupContentFiles() so a test run never leaves files
// behind in the real content directory.
const writtenFiles = [];

function writeAssignmentMd(mdPath, markdown) {
  const fullPath = path.join(CONTENT_DIR, mdPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, markdown, 'utf-8');
  writtenFiles.push(fullPath);
  return fullPath;
}

function cleanupContentFiles() {
  while (writtenFiles.length) {
    fs.rmSync(writtenFiles.pop(), { force: true });
  }
}

// Inserts an assignment row via the real db layer and, if `markdown` is
// given, writes the backing content file so routes that read it (edit,
// save, student assignment view) work against a real file on disk.
function seedAssignment({
  courseId = 'course-1',
  title,
  mdPath,
  targetType = 'group',
  targetStudentId = null,
  dueDate = '2026-12-31',
  markdown,
}) {
  if (markdown !== undefined) writeAssignmentMd(mdPath, markdown);
  return db.createAssignment({ courseId, title, mdPath, targetType, targetStudentId, dueDate });
}

function seedSubmission(opts) {
  return db.createSubmission(opts);
}

module.exports = { seedAssignment, seedSubmission, writeAssignmentMd, cleanupContentFiles, CONTENT_DIR };
