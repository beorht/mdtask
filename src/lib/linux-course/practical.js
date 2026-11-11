// Практическая работа «Терминал» (web-1 + TEST): последовательность шагов на общей нарастающей ФС.
// Контент — content/linux/practical.js; проверка шага — тем же движком (checkMission по накопленному
// журналу команд). Прогресс и журнал хранятся в linux_progress (itemId 'pr:<step>' и 'pr:log').
// Время открытия — linux_practical_window (пусто = открыто сразу).
const path = require('path');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');
const { checkMission } = require('./validate');
const { LINUX_GROUPS, LinuxCourseError } = require('./index');

const P = require(path.join(__dirname, '..', '..', '..', 'content', 'linux', 'practical.js'));
const STEP_BY_ID = new Map(P.steps.map((s) => [s.id, s]));
const LOG_ITEM = 'pr:log';
const MAX_LOG = 600;
const stepItem = (id) => `pr:${id}`;

function canSee(user) {
  return !!user && user.role === 'student' && (hasFullAccess(user) || LINUX_GROUPS.includes(user.group));
}

// Состояние окна открытия: scheduled/before/open. Пусто (нет opens_at) = открыто сразу.
function windowState(now = Date.now()) {
  const opensAt = db.getLinuxPracticalOpen();
  if (!opensAt) return { scheduled: false, before: false, open: true, opensAt: null };
  const o = Date.parse(opensAt);
  return { scheduled: true, before: now < o, open: now >= o, opensAt };
}
function isOpenFor(user, now = Date.now()) {
  return hasFullAccess(user) || windowState(now).open;
}

function progressMap(studentId) {
  return new Map(db.getLinuxProgress(studentId).map((p) => [p.itemId, p.stats]));
}

function solvedSet(studentId) {
  const pm = progressMap(studentId);
  const set = new Set();
  P.steps.forEach((s) => { const st = pm.get(stepItem(s.id)); if (st && st.solvedAt) set.add(s.id); });
  return set;
}

// Данные для страницы/клиента: шаги (без эталонов и правил), индекс текущего, сохранённый журнал.
function view(user) {
  const pm = progressMap(user.id);
  const solved = solvedSet(user.id);
  const steps = P.steps.map((s, i) => ({
    index: i, id: s.id, cmd: s.cmd, task: s.task, syntax: s.syntax || [], hint: s.hint || '', solved: solved.has(s.id),
  }));
  const firstUnsolved = steps.findIndex((s) => !s.solved);
  const logStats = pm.get(LOG_ITEM);
  return {
    key: P.key,
    title: P.title,
    lead: P.lead,
    startCwd: P.startCwd || '~',
    fs: P.fs,
    steps,
    total: steps.length,
    solvedCount: solved.size,
    currentIndex: firstUnsolved === -1 ? steps.length : firstUnsolved,
    done: firstUnsolved === -1,
    savedLog: (logStats && logStats.log) || [],
  };
}

// «Проверить» шаг: сервер повторяет накопленный журнал и проверяет правила этого шага.
function checkStep(user, stepId, body, now = new Date().toISOString()) {
  const step = STEP_BY_ID.get(stepId);
  if (!step) throw new LinuxCourseError(404, 'Шаг не найден.');
  const log = Array.isArray(body && body.log) ? body.log.slice(0, MAX_LOG).map((l) => String(l || '')) : [];
  const res = checkMission({ fs: P.fs, startCwd: P.startCwd, check: step.check }, log);
  // сохраняем накопленный журнал (для восстановления ФС после перезагрузки)
  db.saveLinuxProgress(user.id, LOG_ITEM, { log: log.slice(-MAX_LOG) });
  if (res.solved) {
    const prev = progressMap(user.id).get(stepItem(stepId)) || {};
    if (!prev.solvedAt) db.saveLinuxProgress(user.id, stepItem(stepId), { solvedAt: now });
  }
  db.addLinuxEvent({ studentId: user.id, itemId: stepItem(stepId), type: 'check', solved: res.solved, at: now });
  const solved = solvedSet(user.id);
  const nextIndex = P.steps.findIndex((s) => !solved.has(s.id));
  return {
    solved: res.solved,
    results: res.results,
    nextIndex: nextIndex === -1 ? P.steps.length : nextIndex,
    done: nextIndex === -1,
  };
}

module.exports = { canSee, windowState, isOpenFor, view, checkStep, STEP_BY_ID, TITLE: P.title, KEY: P.key };
