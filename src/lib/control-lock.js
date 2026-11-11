// Блокировка остальной практики на время КОНТРОЛЬНЫХ (отдельно от итоговых экзаменов в exams):
//  • ИБ-контрольная (ib-mid) — группа ib-2, пока открыто окно ib_mid_window;
//  • Веб-контрольная — группа web-2, пока открыто окно личного задания студента (assignments.opens_at).
// Возвращает объект блокировки в формате examLockFor ({ id, title, during, href, ... }) или null.
// TEST (hasFullAccess) не блокируется — проверяется в examLockFor до вызова этого модуля.
const mid = require('./ib-mid');
const { assignmentWindow } = require('./assignment-window');

const WEB_CONTROL_TITLE = 'Каталог на XML и DOM (двухстраничный сайт)';
const WEB_CONTROL_GROUPS = ['web-2'];

// Личное задание веб-контрольной данного студента (или null).
function webControlAssignment(user) {
  const db = require('./../db');
  return (
    db
      .getAssignments()
      .find((a) => a.targetType === 'individual' && a.targetStudentId === user.id && a.title === WEB_CONTROL_TITLE) || null
  );
}

function controlLockFor(user, now = Date.now()) {
  if (!user || user.role !== 'student') return null;

  // ИБ-контрольная: группа ib-2, окно открыто.
  if (mid.MID_GROUPS.includes(user.group)) {
    const win = mid.windowState(now);
    if (win.open) {
      return { id: mid.MID_KEY, title: mid.MID_TITLE, group: user.group, during: true, href: `/exam/${mid.MID_KEY}`, kind: 'ib-mid', window: win };
    }
  }

  // Веб-контрольная: группа web-2, окно личного задания открыто.
  if (WEB_CONTROL_GROUPS.includes(user.group)) {
    const a = webControlAssignment(user);
    if (a) {
      const win = assignmentWindow(a, now);
      if (win.hasWindow && win.open) {
        return { id: a.id, title: 'Веб-контрольная', group: user.group, during: true, href: `/assignment/${a.id}`, kind: 'web', assignmentId: a.id, window: win };
      }
    }
  }

  return null;
}

module.exports = { controlLockFor, WEB_CONTROL_TITLE, WEB_CONTROL_GROUPS };
