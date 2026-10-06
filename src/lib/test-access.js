// Test/demo accounts: a student in this group sees every group assignment (whatever group
// it targets) and has the whole SQL trainer unlocked. The group is hidden from the teacher's
// group lists, so it can't be picked as an assignment target.
const TEST_GROUP = 'TEST';

function hasFullAccess(user) {
  return !!user && user.role === 'student' && user.group === TEST_GROUP;
}

module.exports = { TEST_GROUP, hasFullAccess };
