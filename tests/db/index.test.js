const test = require('node:test');
const assert = require('node:assert');
const db = require('../../src/db');
const { seedAssignment } = require('../helpers/fixtures');

test.beforeEach(() => db.__resetForTests());

test('getUsers returns seeded student and teacher accounts', () => {
  const users = db.getUsers();
  assert.ok(users.find((u) => u.id === 'student-1' && u.role === 'student'));
  assert.ok(users.find((u) => u.id === 'teacher-1' && u.role === 'teacher'));
});

test('getAssignments includes an individual assignment scoped to its target student', () => {
  const created = seedAssignment({
    title: 'Доп. задание',
    mdPath: 'individual/student-1/extra.md',
    targetType: 'individual',
    targetStudentId: 'student-1',
  });
  const individual = db.getAssignments().find((a) => a.id === created.id);
  assert.strictEqual(individual.targetType, 'individual');
  assert.strictEqual(individual.targetStudentId, 'student-1');
  assert.strictEqual(individual.mdPath, 'individual/student-1/extra.md');
});

test('updateSubmissionStatus persists the new status and comment', () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const submission = db.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['a.zip'] });
  db.updateSubmissionStatus(submission.id, 'done', 'Отлично');
  const after = db.getSubmissions().find((s) => s.id === submission.id);
  assert.strictEqual(after.status, 'done');
  assert.strictEqual(after.comment, 'Отлично');
});

test('reopenSubmission resets status to pending', () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const submission = db.createSubmission({ assignmentId: assignment.id, studentId: 'student-1', files: ['a.zip'] });
  db.updateSubmissionStatus(submission.id, 'not_done', 'Плохо');
  db.reopenSubmission(submission.id);
  const after = db.getSubmissions().find((s) => s.id === submission.id);
  assert.strictEqual(after.status, 'pending');
});

test('createSubmission inserts a new row linked to its parent', () => {
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  const created = db.createSubmission({
    assignmentId: assignment.id,
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
  const assignment = seedAssignment({ title: 'A', mdPath: 'a.md' });
  db.createSubmission({ assignmentId: assignment.id, studentId: 'student-2', files: ['x.zip'] });
  db.__resetForTests();
  assert.strictEqual(db.getSubmissions().length, 0);
  assert.strictEqual(db.getAssignments().length, 0);
});
