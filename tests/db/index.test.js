const test = require('node:test');
const assert = require('node:assert');
const db = require('../../src/db');

test.beforeEach(() => db.__resetForTests());

test('getUsers returns seeded student and teacher accounts', () => {
  const users = db.getUsers();
  assert.ok(users.find((u) => u.id === 'student-1' && u.role === 'student'));
  assert.ok(users.find((u) => u.id === 'teacher-1' && u.role === 'teacher'));
});

test('getAssignments includes one individual assignment for student-1', () => {
  const assignments = db.getAssignments();
  const individual = assignments.find((a) => a.targetType === 'individual');
  assert.strictEqual(individual.targetStudentId, 'student-1');
  assert.strictEqual(individual.mdPath, 'individual/student-1/extra-task.md');
});

test('updateSubmissionStatus persists the new status and comment', () => {
  const before = db.getSubmissions()[0];
  db.updateSubmissionStatus(before.id, 'done', 'Отлично');
  const after = db.getSubmissions().find((s) => s.id === before.id);
  assert.strictEqual(after.status, 'done');
  assert.strictEqual(after.comment, 'Отлично');
});

test('reopenSubmission resets status to pending', () => {
  const target = db.getSubmissions().find((s) => s.status === 'not_done');
  db.reopenSubmission(target.id);
  const after = db.getSubmissions().find((s) => s.id === target.id);
  assert.strictEqual(after.status, 'pending');
});

test('createSubmission inserts a new row linked to its parent', () => {
  const created = db.createSubmission({
    assignmentId: 'assign-3',
    studentId: 'student-2',
    files: ['test.zip'],
    parentSubmissionId: null,
  });
  assert.strictEqual(created.status, 'pending');
  assert.deepStrictEqual(created.files, ['test.zip']);
  const persisted = db.getSubmissions().find((s) => s.id === created.id);
  assert.strictEqual(persisted.studentId, 'student-2');
});

test('__resetForTests wipes and re-seeds so state does not leak between tests', () => {
  db.createSubmission({ assignmentId: 'assign-3', studentId: 'student-2', files: ['x.zip'] });
  db.__resetForTests();
  const submissions = db.getSubmissions();
  assert.strictEqual(submissions.length, 3);
});
