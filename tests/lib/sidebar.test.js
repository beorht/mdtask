const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { buildSidebarTree } = require('../../src/lib/sidebar');
const db = require('../../src/db');

const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

const FIXTURE_SUMMARY = [
  '# Summary',
  '',
  '- [Раздел 1]()',
  '  - [Задание 1](section-1/task-1.md)',
  '  - [Задание 2](section-1/task-2.md)',
  '- [Мои доп. задания]()',
  '  - [Доп. задание](individual/student-1/extra.md)',
  '',
].join('\n');

let originalSummary;
let assignTask1;
let assignTask2;
let assignExtra;

test.before(() => {
  originalSummary = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  fs.writeFileSync(SUMMARY_PATH, FIXTURE_SUMMARY, 'utf-8');
});

test.after(() => {
  fs.writeFileSync(SUMMARY_PATH, originalSummary, 'utf-8');
});

test.beforeEach(() => {
  db.__resetForTests();
  assignTask1 = db.createAssignment({ courseId: 'course-1', title: 'Задание 1', mdPath: 'section-1/task-1.md', targetType: 'group', targetStudentId: null, dueDate: '2026-12-31' });
  assignTask2 = db.createAssignment({ courseId: 'course-1', title: 'Задание 2', mdPath: 'section-1/task-2.md', targetType: 'group', targetStudentId: null, dueDate: '2026-12-31' });
  assignExtra = db.createAssignment({ courseId: 'course-1', title: 'Доп. задание', mdPath: 'individual/student-1/extra.md', targetType: 'individual', targetStudentId: 'student-1', dueDate: '2026-12-31' });
});

test('student tree includes own individual assignment with status', () => {
  const tree = buildSidebarTree({ role: 'student', studentId: 'student-1' });
  const individualSection = tree.find((n) => n.title === 'Мои доп. задания');
  assert.ok(individualSection);
  assert.strictEqual(individualSection.children[0].assignmentId, assignExtra.id);
  assert.strictEqual(individualSection.children[0].status, 'not_submitted');
});

test('other student tree hides individual assignment entirely', () => {
  const tree = buildSidebarTree({ role: 'student', studentId: 'student-2' });
  const individualSection = tree.find((n) => n.title === 'Мои доп. задания');
  assert.strictEqual(individualSection.children.length, 0);
});

test('teacher tree sees every assignment including individual ones', () => {
  const tree = buildSidebarTree({ role: 'teacher' });
  const individualSection = tree.find((n) => n.title === 'Мои доп. задания');
  assert.strictEqual(individualSection.children.length, 1);
  assert.strictEqual(individualSection.children[0].status, null);
});

test('assignment with a resubmission chain reports the latest submission status', () => {
  db.createSubmission({ assignmentId: assignTask2.id, studentId: 'student-1', files: ['v1.zip'] });
  const tree = buildSidebarTree({ role: 'student', studentId: 'student-1' });
  const section1 = tree.find((n) => n.title === 'Раздел 1');
  const task = section1.children[1];
  assert.strictEqual(task.assignmentId, assignTask2.id);
  assert.strictEqual(task.status, 'pending');
});
