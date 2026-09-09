const test = require('node:test');
const assert = require('node:assert');
const { buildSidebarTree } = require('../../src/lib/sidebar');

test('student tree includes own individual assignment with status', () => {
  const tree = buildSidebarTree({ role: 'student', studentId: 'student-1' });
  const individualSection = tree.find((n) => n.title === 'Мои доп. задания');
  assert.ok(individualSection);
  assert.strictEqual(individualSection.children[0].assignmentId, 'assign-4');
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
  const tree = buildSidebarTree({ role: 'student', studentId: 'student-1' });
  const section1 = tree.find((n) => n.title === 'Раздел 1');
  const task = section1.children[1];
  assert.strictEqual(task.assignmentId, 'assign-2');
  assert.strictEqual(task.status, 'pending');
});
