// Test/demo accounts: a student in this group sees every group assignment (whatever group
// it targets) and has the whole SQL trainer unlocked. The group is hidden from the teacher's
// group lists, so it can't be picked as an assignment target.
const TEST_GROUP = 'TEST';

function hasFullAccess(user) {
  return !!user && user.role === 'student' && user.group === TEST_GROUP;
}

// Groups that don't get the shared assignments (target_group = NULL, «все группы»): PRAK (its
// «Python'da oddiy dasturlash» course was removed on 26.10.2026, archived in docs/archive/pybasics/).
// Their own group / individual assignments still show.
// web-1 (с 27.10.2026) — тоже: группа начинает с нуля, старые общие задания со сроками ей не выдаются.
const NO_SHARED_GROUPS = ['PRAK', 'web-1'];

function seesSharedAssignments(group) {
  return !NO_SHARED_GROUPS.includes(group);
}

// Группы, которым пока открыты только перечисленные предметы (ключи карточек на главной: sql, emmet, html,
// python, javascript, ib, pis…): остальные карточки не показываются, их страницы отвечают 404 (subjectGuard).
const GROUP_SUBJECTS = { 'web-1': ['html', 'css', 'emmet'] };
// Группы, которым скрыты отдельные предметы (остальные видны как обычно): web-2 не изучает Python (с 27.10.2026).
const GROUP_HIDDEN_SUBJECTS = { 'web-2': ['python'] };

function subjectAllowed(user, key) {
  if (!user || user.role !== 'student') return true;
  const only = GROUP_SUBJECTS[user.group];
  const hidden = GROUP_HIDDEN_SUBJECTS[user.group] || [];
  return (!only || only.includes(key)) && !hidden.includes(key);
}

// Предмет по адресу страницы (null — адрес не относится к предмету).
function subjectOfPath(p) {
  if (/^\/(trainer|sql)(\/|$)/.test(p)) return 'sql';
  if (/^\/ib(\/|$)/.test(p)) return 'ib';
  const m = /^\/subjects\/([^/]+)/.exec(p);
  return m ? m[1] : null;
}

/** Middleware: страницы закрытых для группы предметов — 404. */
function subjectGuard(req, res, next) {
  const key = subjectOfPath(req.path);
  if (key && req.session && !subjectAllowed(req.session.user, key)) return res.status(404).render('404');
  next();
}

module.exports = { TEST_GROUP, NO_SHARED_GROUPS, GROUP_SUBJECTS, GROUP_HIDDEN_SUBJECTS, hasFullAccess, seesSharedAssignments, subjectAllowed, subjectGuard };
