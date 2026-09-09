const test = require('node:test');
const assert = require('node:assert');
const fixtures = require('../../src/fixtures');

test('getUsers returns seeded student and teacher accounts', () => {
  const users = fixtures.getUsers();
  assert.ok(users.find((u) => u.id === 'student-1' && u.role === 'student'));
  assert.ok(users.find((u) => u.id === 'teacher-1' && u.role === 'teacher'));
});

test('getAssignments includes one individual assignment for student-1', () => {
  const assignments = fixtures.getAssignments();
  const individual = assignments.find((a) => a.targetType === 'individual');
  assert.strictEqual(individual.targetStudentId, 'student-1');
  assert.strictEqual(individual.mdPath, 'individual/student-1/extra-task.md');
});

test('updateSubmissionStatus mutates the in-memory submission', () => {
  fixtures.__resetForTests();
  const before = fixtures.getSubmissions()[0];
  fixtures.updateSubmissionStatus(before.id, 'done', 'Отлично');
  const after = fixtures.getSubmissions().find((s) => s.id === before.id);
  assert.strictEqual(after.status, 'done');
  assert.strictEqual(after.comment, 'Отлично');
});

test('reopenSubmission resets status to pending', () => {
  fixtures.__resetForTests();
  const target = fixtures.getSubmissions().find((s) => s.status === 'not_done');
  fixtures.reopenSubmission(target.id);
  const after = fixtures.getSubmissions().find((s) => s.id === target.id);
  assert.strictEqual(after.status, 'pending');
});
