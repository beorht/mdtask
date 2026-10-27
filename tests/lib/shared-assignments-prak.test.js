const test = require('node:test');
const assert = require('node:assert');
const db = require('../../src/db');
const { seedAssignment } = require('../helpers/fixtures');
const { seesSharedAssignments } = require('../../src/lib/test-access');

test.beforeEach(() => {
  db.__resetForTests();
});

test('PRAK does not get assignments for all groups, only its own', () => {
  const shared = seedAssignment({ title: 'Общее', mdPath: 'shared-prak-test.md' });
  const own = seedAssignment({ title: 'Своё', mdPath: 'own-prak-test.md', targetGroup: 'PRAK' });
  assert.strictEqual(seesSharedAssignments('PRAK'), false);
  assert.strictEqual(seesSharedAssignments('WEB'), true);

  const prak = db.getAssignmentsForStudent('prak-x', 'PRAK').map((a) => a.id);
  assert.deepStrictEqual(prak, [own.id]);

  const web = db.getAssignmentsForStudent('web-x', 'WEB').map((a) => a.id);
  assert.deepStrictEqual(web, [shared.id]);

  const all = db.getAssignmentsForStudent('t', 'TEST').map((a) => a.id).sort();
  assert.deepStrictEqual(all, [shared.id, own.id].sort());
});
